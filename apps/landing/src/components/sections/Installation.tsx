import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { BlurFade } from '../reactbits'
import { BrandIcon } from '../ui/brand-icon'
import { CodeBlock } from '../ui/code-block'

interface Platform {
  id: string
  label: string
  icon: string
  registry: string
  install: string[]
  packages: string[]
  example: { filename: string; language: string; code: string }
}

const PLATFORMS: Platform[] = [
  {
    id: 'javascript',
    label: 'JavaScript / TypeScript',
    icon: 'npm',
    registry: 'npm',
    install: ['npm install @aspectly/core', 'npm install @aspectly/web'],
    packages: ['@aspectly/core', '@aspectly/web', '@aspectly/react-native', '@aspectly/react-native-web', '@aspectly/transports'],
    example: {
      filename: 'App.tsx',
      language: 'typescript',
      code: `import { useAspectlyIframe } from '@aspectly/web';

function App() {
  const [bridge, loaded, Iframe] = useAspectlyIframe({
    url: 'https://widget.example.com'
  });

  useEffect(() => {
    if (loaded) {
      bridge.init({
        getUserData: async () => ({ name: 'John Doe', role: 'Admin' })
      });
    }
  }, [loaded]);

  return <Iframe style={{ width: '100%', height: 400 }} />;
}`,
    },
  },
  {
    id: 'dotnet',
    label: '.NET',
    icon: '.net',
    registry: 'NuGet',
    install: ['dotnet add package Aspectly.Bridge.CefSharp', 'dotnet add package Aspectly.Bridge.WebView2'],
    packages: ['Aspectly.Bridge', 'Aspectly.Bridge.CefSharp', 'Aspectly.Bridge.WebView2'],
    example: {
      filename: 'MainWindow.cs',
      language: 'csharp',
      code: `using Aspectly.Bridge;
using Aspectly.Bridge.CefSharp;

var bridge = new BridgeHost(new CefSharpBrowserBridge(browser));

bridge.RegisterHandler<object, object>("getUserData", async _ =>
    new { name = "John Doe", role = "Admin" });

await bridge.InitializeAsync();`,
    },
  },
  {
    id: 'swift',
    label: 'iOS / macOS / visionOS',
    icon: 'swift',
    registry: 'SwiftPM · CocoaPods',
    install: ['.package(url: "https://github.com/JeanIsahakyan/aspectly.git", from: "2.2.0")', "pod 'AspectlyBridgeWebKit'"],
    packages: ['AspectlyBridge', 'AspectlyBridgeWebKit'],
    example: {
      filename: 'ContentView.swift',
      language: 'swift',
      code: `import SwiftUI
import AspectlyBridge
import AspectlyBridgeWebKit

struct ContentView: View {
  @StateObject private var model = AspectlyWebViewModel(
    url: URL(string: "https://widget.example.com")!
  )

  var body: some View {
    AspectlyWebView(model: model)
      .onChange(of: model.isLoaded) { loaded in
        guard loaded else { return }
        Task {
          model.bridge.registerHandler("getUserData") { _ in
            UserData(name: "John Doe", role: "Admin")
          }
          try await model.bridge.initialize()
        }
      }
  }
}`,
    },
  },
  {
    id: 'android',
    label: 'Android',
    icon: 'android',
    registry: 'Maven Central',
    install: ['implementation("io.github.jeanisahakyan:aspectly-bridge-webview:2.2.0")'],
    packages: ['io.github.jeanisahakyan:aspectly-bridge', 'io.github.jeanisahakyan:aspectly-bridge-webview'],
    example: {
      filename: 'MainActivity.kt',
      language: 'kotlin',
      code: `import com.aspectly.bridge.BridgeHost
import com.aspectly.bridge.webview.AndroidWebViewBrowserBridge

val bridge = BridgeHost(AndroidWebViewBrowserBridge(webView))
bridge.registerHandler("getUserData") { _ ->
  UserData(name = "John Doe", role = "Admin")
}

webView.webViewClient = object : WebViewClient() {
  override fun onPageFinished(view: WebView?, url: String?) {
    lifecycleScope.launch { bridge.initialize() }
  }
}
webView.loadUrl("https://widget.example.com")`,
    },
  },
  {
    id: 'flutter',
    label: 'Flutter',
    icon: 'flutter',
    registry: 'pub.dev',
    install: ['flutter pub add aspectly_bridge'],
    packages: ['aspectly_bridge'],
    example: {
      filename: 'main.dart',
      language: 'dart',
      code: `import 'package:aspectly_bridge/aspectly_bridge.dart';

// browserBridge wraps a webview_flutter WebViewController
final bridge = BridgeHost(browserBridge);

bridge.registerHandler('getUserData', (params) => {
  'name': 'John Doe',
  'role': 'Admin',
});

// In NavigationDelegate.onPageFinished:
await bridge.initialize();`,
    },
  },
  {
    id: 'python',
    label: 'Python / Linux',
    icon: 'python',
    registry: 'PyPI',
    install: ['pip install "aspectly-bridge[webkitgtk]"'],
    packages: ['aspectly-bridge'],
    example: {
      filename: 'main.py',
      language: 'python',
      code: `from aspectly_bridge import BridgeHost
from aspectly_bridge.webkitgtk import WebKitGTKBrowserBridge

bridge = BridgeHost(WebKitGTKBrowserBridge(web_view))

bridge.register_handler(
    "getUserData",
    lambda params: {"name": "John Doe", "role": "Admin"},
)

# On WebKit2.LoadEvent.FINISHED:
bridge.initialize()`,
    },
  },
]

const WIDGET_CODE = `import { AspectlyBridge } from '@aspectly/core';

const bridge = new AspectlyBridge();

// Register handlers the host can call, then init
await bridge.init({
  getUserData: async () => ({ name: 'John Doe', role: 'Admin' }),
});

// Call into the host — fully typed, identical on every platform
const device = await bridge.send<DeviceInfo>('getDeviceInfo');`

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy command"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

export function Installation() {
  const [pid, setPid] = useState('javascript')
  const p = PLATFORMS.find((x) => x.id === pid) ?? PLATFORMS[0]

  return (
    <section id="installation" className="relative py-20 lg:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <BlurFade delay={0.1} inView>
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-muted-foreground">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              Get started
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold sm:text-4xl lg:text-5xl">
              Install once, <span className="gradient-text">use anywhere</span>
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Pick your platform — add the package and wire up the bridge. The same
              embedded web content (<span className="font-mono text-foreground">@aspectly/core</span>) runs across every host.
            </p>
          </div>
        </BlurFade>

        {/* Platform selector */}
        <BlurFade delay={0.15} inView>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {PLATFORMS.map((plat) => {
              const active = plat.id === pid
              return (
                <button
                  key={plat.id}
                  onClick={() => setPid(plat.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'border-primary/40 bg-primary/10 text-primary shadow-soft'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:shadow-soft'
                  }`}
                >
                  <BrandIcon name={plat.icon} className="h-4 w-4 opacity-80" />
                  {plat.label}
                </button>
              )
            })}
          </div>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-2">
            {/* 1 — Install */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BrandIcon name={p.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    1 — Install · {p.registry}
                  </p>
                  <h3 className="font-display text-base font-semibold">{p.label}</h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {p.install.map((cmd) => (
                  <div
                    key={cmd}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5"
                  >
                    <span className="select-none font-mono text-xs text-primary">$</span>
                    <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.8rem] text-foreground/90">
                      {cmd}
                    </code>
                    <CopyButton text={cmd} />
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Packages</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.packages.map((pkg) => (
                    <span
                      key={pkg}
                      className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                    >
                      {pkg}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2 — Use it */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift">
              <div className="flex items-center gap-3 px-6 pt-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">2 — Use it</p>
                  <h3 className="font-display text-base font-semibold">{p.example.filename}</h3>
                </div>
              </div>
              <div className="px-3 pb-3 pt-4">
                <CodeBlock code={p.example.code} language={p.example.language} showLineNumbers={false} />
              </div>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} inView>
          <div className="mx-auto mt-6 max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex flex-wrap items-center gap-3 px-6 pt-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BrandIcon name="npm" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  On the web side · same on every platform
                </p>
                <h3 className="font-display text-base font-semibold">@aspectly/core — widget.ts</h3>
              </div>
              <span className="ml-auto hidden rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground sm:inline">
                unchanged everywhere
              </span>
            </div>
            <div className="px-3 pb-3 pt-4">
              <CodeBlock code={WIDGET_CODE} language="typescript" showLineNumbers={false} />
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
