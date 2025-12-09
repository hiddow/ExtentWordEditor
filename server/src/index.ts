import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { generateVocabData, generateVocabImage, generateVocabAudio } from './aiService.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3002);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large payloads (images)

// --- AI GENERATION ---

app.post('/ai/generate/vocab', async (req, res) => {
    const { term, lang } = req.body;
    try {
        const data = await generateVocabData(term, lang);
        res.json(data);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Generation failed' });
    }
});

app.post('/ai/generate/image', async (req, res) => {
    const { term } = req.body;
    try {
        const data = await generateVocabImage(term);
        res.json({ imageUrl: data });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Image generation failed' });
    }
});

app.post('/ai/generate/audio', async (req, res) => {
    const { text, voice, style } = req.body;
    try {
        const data = await generateVocabAudio(text, voice, style);
        res.json({ audioUrl: data });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Audio generation failed' });
    }
});

// --- AUTH ---

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // In a real app, hash and compare passwords.
    // Here we find the user by username and simple match for "mock" security as requested.
    const user = await prisma.user.findUnique({
      where: { username }
    });
    console.log('Login attempt:', { username, passwordReceived: password, userFound: !!user, userPass: user?.password });

    if (user && user.password === password) {
      const { password: _password, ...safeUser } = user;
      let parsedPermissions: any = {};
      try {
        parsedPermissions = user.permissions ? JSON.parse(user.permissions) : {};
      } catch (err) {
        console.error('Failed to parse permissions JSON for user', username, err);
      }
      res.json({
        ...safeUser,
        permissions: parsedPermissions
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Auth error' });
  }
});

// --- APPS & CONTEXT ---

app.get('/apps', async (req, res) => {
  const apps = await prisma.appDefinition.findMany();
  res.json(apps);
});

app.post('/apps', async (req, res) => {
  const { name } = req.body;
  try {
    const newApp = await prisma.appDefinition.create({
      data: { name }
    });
    res.json(newApp);
  } catch (e) {
    res.status(400).json({ error: 'App name likely exists' });
  }
});

// --- VOCAB ITEMS ---

app.get('/vocab', async (req, res) => {
  const { appName } = req.query;
  try {
    const items = await prisma.vocabItem.findMany({
      where: appName ? { appName: String(appName) } : {}
    });
    
    // Parse JSON strings back to objects
    const parsed = items.map((i: any) => ({
      ...i,
      translations: JSON.parse(i.translations),
      exampleTranslations: JSON.parse(i.exampleTranslations)
    }));
    
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Fetch error' });
  }
});

app.post('/vocab', async (req, res) => {
  const items = req.body; // Array of items
  
  if (!Array.isArray(items)) {
     res.status(400).json({ error: 'Expected array of items' });
     return;
  }

  try {
    // We need to manage intId manually or let DB do it. 
    // Schema says intId is Int, not autoincrement in the schema def I wrote?
    // Let's check schema. I wrote `intId Int`. 
    // Ideally we find the max intId and increment.
    
    // For simplicity in this batch operation, we'll find max first.
    // Note: Concurrency issues possible here but acceptable for this scale.
    const maxItem = await prisma.vocabItem.findFirst({
        orderBy: { intId: 'desc' }
    });
    let nextId = (maxItem?.intId || 0) + 1;

    const createdItems = [];
    
    for (const item of items) {
        // Stringify JSON fields
        const { id, intId, ...rest } = item; 
        
        // We ignore client-sent IDs to ensure DB integrity, OR we honor them if we want to sync?
        // Let's create NEW ids for DB insertions to be safe, unless it's a "sync"
        // But for "add", we usually generate new.
        
        const newItem = await prisma.vocabItem.create({
            data: {
                ...rest,
                intId: nextId++,
                translations: JSON.stringify(item.translations || {}),
                exampleTranslations: JSON.stringify(item.exampleTranslations || {}),
            }
        });
        createdItems.push(newItem);
    }
    
    // Return with parsed JSON
    const parsed = createdItems.map((i: any) => ({
        ...i,
        translations: JSON.parse(i.translations),
        exampleTranslations: JSON.parse(i.exampleTranslations)
    }));

    res.json(parsed);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Save error' });
  }
});

app.put('/vocab/:id', async (req, res) => {
    const { id } = req.params;
    const item = req.body;
    
    try {
        const updated = await prisma.vocabItem.update({
            where: { id },
            data: {
                ...item,
                id: undefined, // Don't update ID
                intId: undefined, // Don't update IntID
                translations: JSON.stringify(item.translations || {}),
                exampleTranslations: JSON.stringify(item.exampleTranslations || {})
            }
        });
        
        res.json({
            ...updated,
            translations: JSON.parse(updated.translations),
            exampleTranslations: JSON.parse(updated.exampleTranslations)
        });
    } catch (e) {
        res.status(500).json({ error: 'Update error' });
    }
});

app.delete('/vocab', async (req, res) => {
    const { ids } = req.body; // Array of strings
    if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'Expected { ids: string[] }' });
        return;
     }

    try {
        await prisma.vocabItem.deleteMany({
            where: {
                id: { in: ids }
            }
        });
        
        // Return remaining items? Or just success?
        // Frontend expects "remaining" usually, or we can fetch all again.
        // Let's just return success for efficiency and let frontend refetch if needed, 
        // OR follow CloudService pattern: "return updated list"
        
        const all = await prisma.vocabItem.findMany();
        const parsed = all.map((i: any) => ({
            ...i,
            translations: JSON.parse(i.translations),
            exampleTranslations: JSON.parse(i.exampleTranslations)
        }));
        res.json(parsed);
        
    } catch (e) {
        res.status(500).json({ error: 'Delete error' });
    }
});


// --- SEEDING ---
const seedIfNeeded = async () => {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        await prisma.user.create({
            data: {
                username: 'admin',
                password: 'admin',
                role: 'admin',
                permissions: '{}'
            }
        });
        await prisma.user.create({
            data: {
                username: 'editor',
                password: 'editor',
                role: 'editor',
                permissions: JSON.stringify({ 'LingoDeer': ['common', 'es'] })
            }
        });
        console.log("Seeded Users");
    }
    
    const appCount = await prisma.appDefinition.count();
    if (appCount === 0) {
        await prisma.appDefinition.create({ data: { name: 'LingoDeer' } });
        await prisma.appDefinition.create({ data: { name: 'ChineseSkill' } });
        console.log("Seeded Apps");
    }
};

app.listen(PORT, async () => {
  await seedIfNeeded();
  console.log(`Server running on http://localhost:${PORT}`);
});
