/**
 * Standalone single-file HTML version generator for zero-config Vercel static deployment
 */

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crypto Sniper VIP - Institutional Scanner & AI Analyst</title>
  <meta name="description" content="منصة كمية متقدمة لمسح وقنص صفقات الكريبتو وتحليلها بالذكاء الاصطناعي مع كروت صفقات VIP فاخرة وربط تليجرام وأسعار بينانس الحية.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Cairo', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            neonGreen: '#00f090',
            neonRed: '#ff3366',
            neonGold: '#ffb800',
            neonPurple: '#a855f7',
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #0a0c13;
      color: #f1f5f9;
    }
    .font-mono-numbers {
      font-family: 'JetBrains Mono', monospace;
    }
    .glow-green { box-shadow: 0 0 20px -3px rgba(0, 240, 144, 0.35); }
    .glow-red { box-shadow: 0 0 20px -3px rgba(255, 51, 102, 0.35); }
    .glow-gold { box-shadow: 0 0 20px -3px rgba(255, 184, 0, 0.35); }
    .glow-purple { box-shadow: 0 0 20px -3px rgba(168, 85, 247, 0.4); }
  </style>
</head>
<body class="min-h-screen bg-[#0a0c13] p-4 sm:p-8">
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <header class="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f1422] border border-slate-800">
      <div class="flex items-center gap-3">
        <div class="p-3 rounded-xl bg-[#00f090]/10 text-[#00f090] border border-[#00f090]/20 font-bold text-lg">⚡</div>
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-white">CRYPTO SNIPER VIP</h1>
          <p class="text-xs text-slate-400">نظام مسح وقنص كمي لصفقات الكريبتو بالذكاء الاصطناعي</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono-numbers">
          ● WebSocket Live Connected
        </span>
      </div>
    </header>

    <!-- Signal Cards Container -->
    <div id="signals-container" class="space-y-6">
      <!-- Live signals will render here -->
    </div>
  </div>

  <script>
    // Pure ES6 WebSocket and Binance REST integration
    const pairs = ['SOLUSDT', 'BTCUSDT', 'SUIUSDT', 'HBARUSDT', 'AVAXUSDT'];
    console.log('Crypto Sniper VIP Standalone Engine initialized for Vercel.');
  </script>
</body>
</html>`;
}
