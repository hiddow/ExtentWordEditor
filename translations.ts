
export type UILanguage = 'en' | 'zh';

export const translations = {
  en: {
    app_name: "Extended Vocabulary Editor",
    login_title: "Vocabulary Editor Login",
    login_username: "Username",
    login_password: "Password",
    login_btn: "Sign In",
    login_demo: "Demo Credentials:",
    login_error: "Invalid username or password",
    
    // Header
    product: "PRODUCT",
    target: "TARGET",
    user_admin: "Admin",
    user_editor: "Editor",
    
    // Status / Empty States
    status_no_data_title: "Cloud Vocabulary Workspace",
    status_no_data_desc: "Select a Product and Language to start.",
    status_no_data_desc_sub: "No data found for this selection.",
    status_no_data_sub: "No data found for this selection.",
    btn_import_new: "Import / Create New List",
    btn_start_process: "Start Processing",
    btn_processing: "Processing...",
    search_placeholder: "Search...",
    
    // List
    list_selected: "Selected",
    btn_delete: "Delete",
    filter_label: "FILTER",
    filter_all: "All Items",
    filter_missing_img: "Missing Image",
    filter_missing_audio: "Missing Audio",
    filter_missing_trans: "Missing Translation",
    
    // Editor
    edit_readonly: "READ ONLY",
    edit_unsaved: "Unsaved Changes",
    edit_save: "Save & Complete",
    edit_saved: "Saved",
    edit_regenerate_text: "Regenerate All Text Data (AI)",
    edit_delete_confirm: "Are you sure you want to delete this word?",
    
    // Image
    img_no_image: "No Image",
    img_download: "Download PNG",
    img_generate: "Generate Image",
    img_regenerate: "Regenerate",
    img_settings: "Settings",
    img_prompt_label: "PROMPT",
    img_ref_label: "REFERENCE IMAGE",
    img_upload_ref: "Upload Reference",
    img_btn_generate: "Generate with Settings",
    
    // Audio
    audio_label: "AUDIO",
    audio_no_audio: "No audio generated",
    audio_generate: "Generate Audio",
    audio_generating: "Generating...",
    
    // Fields
    field_script: "SCRIPT",
    field_variant: "VARIANT / TRADITIONAL",
    field_pos: "PART OF SPEECH",
    field_example: "EXAMPLE USAGE",
    field_add_word: "Add Word",
    field_meanings: "MEANINGS",
    field_auto_fill: "Auto-Fill Details",
    field_translations: "TRANSLATIONS",
    hint_token_edit: "Tip: Click on any word block below to view/edit its specific details and translations.",
    
    // Admin Modal
    admin_title: "User Management",
    admin_subtitle: "Manage users and App-specific permissions",
    admin_add_user: "Add New User",
    admin_role: "ROLE",
    admin_perms: "PERMISSIONS",
    admin_create_btn: "Create User",
    admin_existing: "Existing Users",
    admin_copy: "Copy Creds",
    admin_copied: "Copied!",
    
    // Import Modal
    import_title: "Import Vocabulary",
    import_app_label: "Target App / Product",
    import_create_new: "Create New App",
    import_add: "Add",
    import_cancel: "Cancel",
    import_lang_label: "Target Language",
    import_lang_desc: "This list will be created specifically for",
    import_btn_continue: "Continue to Upload",
    import_drag_drop: "Drag & drop or click to browse",
    import_upload_title: "Upload Vocabulary List",
    import_supports: "Supports .xlsx, .xls, .csv",

    // Help
    help_title: "User Guide",
    help_welcome: "Welcome to Extended Vocabulary Editor",
    help_desc: "A collaborative tool for managing multi-language vocabulary lists with AI-powered content generation.",
    help_roles: "User Roles",
    help_role_admin: "Can create/delete apps, import data, manage users, and has full edit access.",
    help_role_editor: "Can edit vocabulary fields based on assigned permissions.",
    help_workflow: "Workflow",
    help_step1: "1. Import Data",
    help_step1_desc: "Admins must first upload an Excel/CSV file containing a list of words. You must specify the Product Name and the Target Language (e.g., 'Learn Chinese'). This creates a unique dataset.",
    help_step2: "2. Select Context",
    help_step2_desc: "Use the dropdowns in the top header to select the Product and Language you wish to work on.",
    help_step3: "3. AI Processing",
    help_step3_desc: "Click 'Start Processing'. The system will use Gemini AI to generate Pinyin, Definitions, Examples, and Translations for pending items.",
    help_step4: "4. Editing & Assets",
    help_step4_desc: "Click on any word to open the Detail View. Here you can: Edit text, Generate vector illustrations, and Generate TTS Audio.",
    help_step5: "5. Export",
    help_step5_desc: "Use the download buttons in the sidebar to export the final dataset (Excel/JSON) or download all generated assets (Images/Audio) as a ZIP file.",
    help_tips: "Pro Tips",
    help_tip1: "For Chinese, the AI automatically generates Standard Pinyin and Traditional characters.",
    help_tip2: "You can click on individual words in the Example Sentence to edit their specific meanings and Pinyin.",
  },
  zh: {
    app_name: "拓展词汇编辑器",
    login_title: "编辑器登录",
    login_username: "用户名",
    login_password: "密码",
    login_btn: "登录",
    login_demo: "演示账号:",
    login_error: "用户名或密码错误",
    
    // Header
    product: "所属产品",
    target: "目标语言",
    user_admin: "管理员",
    user_editor: "编辑",
    
    // Status / Empty States
    status_no_data_title: "云端词汇工作台",
    status_no_data_desc: "请在上方选择一个产品和目标语言以开始。",
    status_no_data_desc_sub: "当前选择无数据。",
    status_no_data_sub: "当前选择无数据。",
    btn_import_new: "导入 / 创建新列表",
    btn_start_process: "开始 AI 处理",
    btn_processing: "处理中...",
    search_placeholder: "搜索...",
    
    // List
    list_selected: "已选择",
    btn_delete: "删除",
    filter_label: "筛选",
    filter_all: "全部词汇",
    filter_missing_img: "缺失图片",
    filter_missing_audio: "缺失音频",
    filter_missing_trans: "缺失翻译",
    
    // Editor
    edit_readonly: "只读模式",
    edit_unsaved: "未保存",
    edit_save: "保存并完成",
    edit_saved: "已保存",
    edit_regenerate_text: "重新生成文本数据 (AI)",
    edit_delete_confirm: "确定要删除这个词汇吗？",
    
    // Image
    img_no_image: "暂无图片",
    img_download: "下载 PNG",
    img_generate: "生成图片",
    img_regenerate: "重新生成",
    img_settings: "设置",
    img_prompt_label: "提示词",
    img_ref_label: "参考图",
    img_upload_ref: "上传参考图",
    img_btn_generate: "按设置生成",
    
    // Audio
    audio_label: "音频",
    audio_no_audio: "未生成音频",
    audio_generate: "生成音频",
    audio_generating: "生成中...",
    
    // Fields
    field_script: "拼音 / 发音",
    field_variant: "繁体 / 变体",
    field_pos: "词性",
    field_example: "例句",
    field_add_word: "添加单词",
    field_meanings: "释义详情",
    field_auto_fill: "AI 自动填充",
    field_translations: "多语言翻译",
    hint_token_edit: "提示：点击下方句子中的单词块，可单独查看或修改其详情和翻译。",
    
    // Admin Modal
    admin_title: "用户管理",
    admin_subtitle: "管理用户及各产品的编辑权限",
    admin_add_user: "添加新用户",
    admin_role: "角色",
    admin_perms: "权限",
    admin_create_btn: "创建用户",
    admin_existing: "现有用户",
    admin_copy: "复制账号",
    admin_copied: "已复制",
    
    // Import Modal
    import_title: "导入词汇数据",
    import_app_label: "所属 App / 产品",
    import_create_new: "创建新产品",
    import_add: "添加",
    import_cancel: "取消",
    import_lang_label: "目标语言",
    import_lang_desc: "此列表将专属于",
    import_btn_continue: "继续上传",
    import_drag_drop: "拖拽文件或点击上传",
    import_upload_title: "上传词汇列表",
    import_supports: "支持 .xlsx, .xls, .csv",

    // Help
    help_title: "使用说明文档",
    help_welcome: "欢迎使用 拓展词汇编辑器",
    help_desc: "一款专为教师和内容创作者设计的 AI 驱动多语言词汇管理工具。",
    help_roles: "用户角色",
    help_role_admin: "管理员：拥有完全权限，可创建/删除产品、导入数据、管理用户。",
    help_role_editor: "普通编辑：仅能编辑被授权的特定语言字段。",
    help_workflow: "工作流程",
    help_step1: "1. 导入数据 (Import)",
    help_step1_desc: "管理员必须先上传 Excel/CSV 词汇表。上传时需指定【产品名称】和【目标语言】（例如：Learn Chinese）。这将创建一个独立的数据集。",
    help_step2: "2. 选择上下文",
    help_step2_desc: "在顶部导航栏的下拉菜单中，选择您要编辑的【产品】和【目标语言】。",
    help_step3: "3. AI 处理",
    help_step3_desc: "点击“开始 AI 处理”。系统将调用 Gemini AI 自动生成拼音、释义、例句分词以及多语言翻译。",
    help_step4: "4. 编辑与素材",
    help_step4_desc: "点击列表中的单词进入详情页。您可以：人工校对文本、生成矢量插图、生成 TTS 语音（支持多种音色和风格）。",
    help_step5: "5. 导出交付",
    help_step5_desc: "使用左侧栏顶部的下载按钮，导出最终的 Excel/JSON 数据，或批量打包下载所有生成的图片和音频文件。",
    help_tips: "小贴士",
    help_tip1: "对于中文，AI 会自动生成标准的空格分词拼音以及繁体字。",
    help_tip2: "您可以点击例句中的每个分词，单独编辑它的拼音和15种语言的释义。",
  }
};
