// PDF模板生成函数
interface NameData {
  chinese: string;
  pinyin: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  meaning: string;
  culturalNotes: string;
  personalityMatch: string;
  style: string;
}

interface UserData {
  englishName: string;
  gender: string;
}

export function generateCertificateHTML(nameData: NameData, userData: UserData): string {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中文名字证书 - ${nameData.chinese}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Serif SC', 'Microsoft YaHei', 'SimSun', serif;
            background: white;
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
            overflow: hidden;
        }
        
        .certificate {
            width: 210mm;
            height: 297mm;
            background: linear-gradient(135deg, #fefefe 0%, #f8f9ff 100%);
            position: relative;
            display: flex;
            flex-direction: column;
        }
        
        /* 装饰性背景 */
        .bg-pattern {
            position: absolute;
            width: 100%;
            height: 100%;
            opacity: 0.03;
            background-image: 
                radial-gradient(circle at 25% 25%, #c41e3a 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, #c41e3a 0%, transparent 50%);
            background-size: 50mm 50mm;
        }
        
        /* 边框装饰 */
        .border-frame {
            position: absolute;
            top: 8mm;
            left: 8mm;
            right: 8mm;
            bottom: 8mm;
            border: 2px solid #c41e3a;
            border-radius: 3mm;
        }
        
        .inner-frame {
            position: absolute;
            top: 12mm;
            left: 12mm;
            right: 12mm;
            bottom: 12mm;
            border: 1px solid #e0a0a0;
            border-radius: 2mm;
        }
        
        /* 印章 */
        .seal {
            position: absolute;
            top: 15mm;
            right: 15mm;
            width: 45mm;
            height: 45mm;
            border: 3px solid #c41e3a;
            border-radius: 50%;
            background: rgba(196, 30, 58, 0.08);
            transform: rotate(-10deg);
            z-index: 2;
        }
        
        .seal-content {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .seal-center {
            font-size: 16px;
            font-weight: 900;
            color: #c41e3a;
            text-transform: uppercase;
            line-height: 1;
        }
        
        .seal-circle-text {
            position: absolute;
            width: 100%;
            height: 100%;
            font-size: 9px;
            font-weight: 700;
            color: #c41e3a;
        }
        
        .seal-circle-text svg {
            width: 100%;
            height: 100%;
        }
        
        .seal-circle-text text {
            fill: #c41e3a;
            font-family: 'Noto Serif SC', 'Microsoft YaHei', 'SimSun', serif;
            font-weight: 700;
            font-size: 7px;
            letter-spacing: 1px;
        }
        
        /* 主内容 */
        .content {
            padding: 18mm 20mm;
            height: 100%;
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
        }
        
        /* 标题区域 */
        .header {
            text-align: center;
            margin-bottom: 12mm;
            flex-shrink: 0;
        }
        
        .title {
            font-size: 28px;
            font-weight: 900;
            color: #c41e3a;
            margin-bottom: 3mm;
            letter-spacing: 4px;
        }
        
        .subtitle {
            font-size: 14px;
            color: #888;
            font-weight: 400;
            letter-spacing: 1px;
        }
        
        /* 主名字展示区 */
        .name-section {
            text-align: center;
            background: linear-gradient(135deg, rgba(196, 30, 58, 0.05) 0%, rgba(196, 30, 58, 0.02) 100%);
            border-radius: 8px;
            padding: 8mm;
            margin-bottom: 8mm;
            border-left: 4px solid #c41e3a;
            flex-shrink: 0;
        }
        
        .english-name {
            font-size: 16px;
            color: #555;
            margin-bottom: 4mm;
            font-weight: 600;
        }
        
        .chinese-name {
            font-size: 48px;
            font-weight: 900;
            color: #c41e3a;
            margin: 4mm 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            line-height: 1.1;
        }
        
        .pinyin {
            font-size: 18px;
            color: #666;
            letter-spacing: 1px;
            margin-bottom: 2mm;
        }
        
        .style-badge {
            display: inline-block;
            background: #c41e3a;
            color: white;
            padding: 2px 8px;
            font-size: 10px;
            border-radius: 12px;
            font-weight: 600;
        }
        
        /* 内容区域 - 双列布局 */
        .main-content {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6mm;
            margin-bottom: 6mm;
        }
        
        /* 左列 */
        .left-column {
            display: flex;
            flex-direction: column;
            gap: 4mm;
        }
        
        /* 右列 */
        .right-column {
            display: flex;
            flex-direction: column;
            gap: 4mm;
        }
        
        /* 内容卡片 */
        .content-card {
            background: white;
            border-radius: 4px;
            padding: 4mm;
            border: 1px solid #f0f0f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .card-title {
            font-size: 12px;
            font-weight: 700;
            color: #c41e3a;
            margin-bottom: 2mm;
            padding-bottom: 1mm;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .card-content {
            font-size: 10px;
            line-height: 1.5;
            color: #444;
            text-align: justify;
        }
        
        /* 字符分析区域 */
        .characters-section {
            grid-column: 1 / -1;
            background: white;
            border-radius: 4px;
            padding: 4mm;
            border: 1px solid #f0f0f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .characters-grid {
            display: grid;
            grid-template-columns: repeat(${nameData.characters.length}, 1fr);
            gap: 3mm;
            margin-top: 2mm;
        }
        
        .character-item {
            text-align: center;
            background: rgba(196, 30, 58, 0.02);
            border-radius: 4px;
            padding: 3mm;
            border: 1px solid rgba(196, 30, 58, 0.1);
        }
        
        .character {
            font-size: 24px;
            font-weight: 900;
            color: #c41e3a;
            margin-bottom: 1mm;
        }
        
        .character-pinyin {
            font-size: 8px;
            color: #666;
            margin-bottom: 1mm;
        }
        
        .character-meaning {
            font-size: 8px;
            font-weight: 600;
            color: #333;
            margin-bottom: 1mm;
        }
        
        .character-explanation {
            font-size: 7px;
            color: #666;
            line-height: 1.3;
        }
        
        /* 底部信息 */
        .footer {
            flex-shrink: 0;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            padding-top: 3mm;
            margin-top: auto;
        }
        
        .date {
            font-size: 10px;
            color: #666;
            margin-bottom: 1mm;
        }
        
        .brand {
            font-size: 8px;
            color: #999;
        }
        
        @media print {
            body, .certificate {
                background: white !important;
            }
            
            .bg-pattern {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <!-- 背景图案 -->
        <div class="bg-pattern"></div>
        
        <!-- 边框装饰 -->
        <div class="border-frame"></div>
        <div class="inner-frame"></div>
        
        <!-- 印章 -->
        <div class="seal">
            <div class="seal-content">
                <div class="seal-circle-text">
                    <svg viewBox="0 0 100 100">
                        <defs>
                            <path id="circle-path" d="M 50, 50 m -32, 0 a 32,32 0 1,1 64,0 a 32,32 0 1,1 -64,0"/>
                        </defs>
                        <text font-size="7" font-weight="700">
                            <textPath href="#circle-path" startOffset="5%">
                                C H I N E S E N A M E ・ C H I N E S E N A M E
                            </textPath>
                        </text>
                    </svg>
                </div>
                <div class="seal-center">CLUB</div>
            </div>
        </div>
        
        <div class="content">
            <!-- 标题 -->
            <div class="header">
                <h1 class="title">中文名字证书</h1>
                <p class="subtitle">Chinese Name Certificate</p>
            </div>
            
            <!-- 名字展示区 -->
            <div class="name-section">
                <div class="english-name">English Name: ${userData.englishName}</div>
                <div class="chinese-name">${nameData.chinese}</div>
                <div class="pinyin">${nameData.pinyin}</div>
                <div class="style-badge">${nameData.style}</div>
            </div>
            
            <!-- 主要内容区 -->
            <div class="main-content">
                <!-- 左列 -->
                <div class="left-column">
                    <!-- 整体含义 -->
                    <div class="content-card">
                        <h3 class="card-title">整体含义</h3>
                        <p class="card-content">${nameData.meaning}</p>
                    </div>
                    
                    <!-- 个性匹配 -->
                    <div class="content-card">
                        <h3 class="card-title">个性匹配</h3>
                        <p class="card-content">${nameData.personalityMatch}</p>
                    </div>
                </div>
                
                <!-- 右列 -->
                <div class="right-column">
                    <!-- 文化背景 -->
                    <div class="content-card" style="height: 100%;">
                        <h3 class="card-title">文化背景</h3>
                        <p class="card-content">${nameData.culturalNotes}</p>
                    </div>
                </div>
                
                <!-- 字符分析（全宽） -->
                <div class="characters-section">
                    <h3 class="card-title">字符详解</h3>
                    <div class="characters-grid">
                        ${nameData.characters.map(char => `
                            <div class="character-item">
                                <div class="character">${char.character}</div>
                                <div class="character-pinyin">${char.pinyin}</div>
                                <div class="character-meaning">${char.meaning}</div>
                                <div class="character-explanation">${char.explanation}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 底部信息 -->
            <div class="footer">
                <div class="date">生成日期：${currentDate}</div>
                <div class="brand">由 AI 中文名字生成器 专业生成</div>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}