import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { BlurFade } from '../reactbits'
import { BrandIcon } from '../ui/brand-icon'

const releases = [
  {
    version: '2.2.0',
    date: '09/05/2026',
    changes: [
      { type: 'fix', date: '09/05/2026', text: 'React Native (iOS / WKWebView): dispatch a plain Event with data as an own property — the MessageEvent init dict was dropped, delivering an empty payload and hanging the handshake' },
      { type: 'fix', date: '09/05/2026', text: 'core: handleInitResult marks the bridge available so the later-initializing side resolves — fixes handshake timeout when the peer’s Init was missed' },
      { type: 'fix', date: '09/05/2026', text: 'React Native: escape injected payloads via JSON.stringify and end the injected script with true; to avoid a WKWebView crash' },
      { type: 'feat', date: '09/05/2026', text: 'transports: webkit, android, and flutter native-host detection registered in the auto-detection registry' },
    ],
  },
  {
    version: '2.1.0',
    date: '06/22/2026',
    changes: [
      { type: 'feat', date: '06/22/2026', text: 'Swift bridge for iOS / macOS / visionOS — AspectlyBridge + AspectlyBridgeWebKit (WKWebView + SwiftUI)' },
      { type: 'feat', date: '06/22/2026', text: 'Android bridge for Kotlin — aspectly-bridge + aspectly-bridge-webview (Android WebView)' },
      { type: 'feat', date: '06/22/2026', text: 'Flutter (Dart) bridge — aspectly_bridge (webview_flutter) on pub.dev' },
      { type: 'feat', date: '06/22/2026', text: 'Linux / WebKitGTK (Python) bridge — aspectly-bridge on PyPI' },
      { type: 'feat', date: '06/22/2026', text: 'JS transports: webkit, android, and flutter for native host detection' },
      { type: 'feat', date: '06/22/2026', text: 'Publishing to Swift Package Manager, CocoaPods, and Maven Central' },
      { type: 'docs', date: '06/22/2026', text: 'examples/swiftui and examples/android sample apps; docs/PUBLISHING.md' },
    ],
  },
  {
    version: '2.0.15',
    date: '06/21/2026',
    changes: [
      { type: 'fix', date: '06/21/2026', text: 'CefSharp: use floating CefSharp.Wpf version for net48' },
      { type: 'docs', date: '06/21/2026', text: 'shields.io badges (stars, npm, NuGet, CI, license) across READMEs and landing' },
      { type: 'docs', date: '06/21/2026', text: 'Changelog: full dates, GitHub/npm/NuGet links per release' },
    ],
  },
  {
    version: '2.0.14',
    date: '03/16/2026',
    changes: [
      { type: 'fix', date: '03/16/2026', text: 'C# dockable pane init protocol fix' },
      { type: 'fix', date: '03/16/2026', text: 'handleInit sets initResultReceived for implicit confirmation' },
      { type: 'fix', date: '03/16/2026', text: 'C# error format compatibility in JS (data + result.error)' },
      { type: 'fix', date: '03/16/2026', text: 'init() resolves only when both Init and InitResult received' },
      { type: 'feat', date: '03/16/2026', text: 'registerHandler() / unregisterHandler() (JS)' },
      { type: 'feat', date: '03/16/2026', text: 'InitializeAsync(handlers) overload (C#)' },
      { type: 'feat', date: '03/16/2026', text: 'Handler execution timeout in C# (default 100s)' },
      { type: 'feat', date: '03/16/2026', text: 'Configurable timeoutMs in BridgeHost constructor' },
      { type: 'fix', date: '03/16/2026', text: 'HandleInitAsync only sends InitResult, matching JS protocol' },
      { type: 'fix', date: '03/16/2026', text: 'InitializeAsync awaits InitResult (was fire-and-forget)' },
      { type: 'ci', date: '03/16/2026', text: 'OIDC trusted publishing for npm (no more NPM_TOKEN)' },
      { type: 'ci', date: '03/16/2026', text: 'pnpm publish to resolve workspace:* protocol' },
    ],
  },
  {
    version: '2.0.7',
    date: '03/11/2026',
    changes: [
      { type: 'feat', date: '03/11/2026', text: 'Thread-safe WPF dispatcher in CefSharpBrowserBridge' },
      { type: 'feat', date: '03/11/2026', text: 'Auto-send InitResult on receiving Init from JS' },
    ],
  },
  {
    version: '2.0.6',
    date: '03/09/2026',
    changes: [
      { type: 'fix', date: '03/09/2026', text: 'Allow landing deploy from workflow_dispatch trigger' },
    ],
  },
  {
    version: '2.0.5',
    date: '03/08/2026',
    changes: [
      { type: 'fix', date: '03/08/2026', text: 'Remove leaked .npmrc with npm token' },
      { type: 'fix', date: '03/08/2026', text: 'Remove yarn configuration remnants' },
    ],
  },
  {
    version: '2.0.3',
    date: '03/08/2026',
    changes: [
      { type: 'feat', date: '03/08/2026', text: 'Publish .NET packages to NuGet on release' },
      { type: 'fix', date: '03/08/2026', text: 'Widget/popup routing for GitHub Pages' },
    ],
  },
  {
    version: '2.0.0',
    date: '03/07/2026',
    changes: [
      { type: 'feat', date: '03/07/2026', text: 'Complete protocol rewrite with Init/InitResult handshake' },
      { type: 'feat', date: '03/07/2026', text: 'Pluggable transport layer (CefSharp, React Native, iframe, window)' },
      { type: 'feat', date: '03/07/2026', text: '.NET: Aspectly.Bridge, Aspectly.Bridge.CefSharp, Aspectly.Bridge.WebView2' },
      { type: 'feat', date: '03/07/2026', text: 'React hooks: @aspectly/react-native, @aspectly/web' },
      { type: 'feat', date: '03/07/2026', text: 'Landing page with live demo, CI/CD pipeline' },
    ],
  },
  {
    version: '1.0.0',
    date: '12/04/2025',
    changes: [
      { type: 'feat', date: '12/04/2025', text: 'Renamed from Aspect to Aspectly' },
      { type: 'feat', date: '12/04/2025', text: 'Monorepo with pnpm workspaces, vitest, CI/CD' },
    ],
  },
  {
    version: '0.1.11',
    date: '03/10/2023',
    changes: [
      { type: 'fix', date: '03/10/2023', text: 'Prevent unnecessary window init events' },
      { type: 'fix', date: '03/10/2023', text: 'React Native Web detection fix' },
      { type: 'fix', date: '03/10/2023', text: 'Browser version fixes' },
    ],
  },
  {
    version: '0.1.8',
    date: '11/20/2022',
    changes: [
      { type: 'fix', date: '11/20/2022', text: 'Support ReactNativeWebView.postMessage for all platforms' },
      { type: 'fix', date: '11/20/2022', text: 'Core error fixes' },
      { type: 'feat', date: '11/20/2022', text: 'Browser UMD bundle support' },
    ],
  },
  {
    version: '0.1.1',
    date: '11/19/2022',
    changes: [
      { type: 'feat', date: '11/19/2022', text: 'Initial release as @jeanisahakyan/chirp' },
      { type: 'feat', date: '11/19/2022', text: 'React Native WebView bridge with platform detection' },
      { type: 'feat', date: '11/19/2022', text: 'Bidirectional message passing with JSON serialization' },
    ],
  },
]

const typeColors: Record<string, string> = {
  feat: 'bg-green-500/10 text-green-600 dark:text-green-400',
  fix: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ci: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  docs: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
}

const typeLabels: Record<string, string> = {
  feat: 'new',
  fix: 'fix',
  ci: 'ci',
  docs: 'docs',
}

const INITIAL_COUNT = 4

export function Changelog() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? releases : releases.slice(0, INITIAL_COUNT)

  return (
    <section id="changelog" className="relative py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <BlurFade delay={0.1} inView>
          <div className="mx-auto max-w-2xl text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-muted-foreground">
              Release history
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold sm:text-4xl lg:text-5xl">
              Changelog
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Recent releases and what changed across every platform.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <div className="relative mx-auto max-w-2xl">
            {/* vertical timeline rail */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border sm:left-2.5" aria-hidden="true" />

            <div className="space-y-8">
              {visible.map((release) => (
                <div key={release.version} className="relative pl-10 sm:pl-12">
                  {/* timeline node */}
                  <span
                    className="absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card shadow-soft"
                    aria-hidden="true"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </span>

                  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-display text-xl font-semibold tracking-tight">
                        v{release.version}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground">{release.date}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`https://github.com/JeanIsahakyan/aspectly/releases/tag/v${release.version}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        GitHub
                      </a>
                      {release.version >= '2.0.0' && (
                        <>
                          <a
                            href={`https://www.npmjs.com/package/@aspectly/core/v/${release.version}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                          >
                            <BrandIcon name="npm" className="h-3 w-3" />
                            npm
                          </a>
                          <a
                            href={`https://www.nuget.org/packages/Aspectly.Bridge/${release.version}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-500/20 dark:text-purple-400"
                          >
                            <BrandIcon name="nuget" className="h-3 w-3" />
                            NuGet
                          </a>
                        </>
                      )}
                      {release.version >= '2.1.0' && (
                        <>
                          <a
                            href={`https://central.sonatype.com/artifact/io.github.jeanisahakyan/aspectly-bridge/${release.version}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-500/20 dark:text-orange-400"
                          >
                            <BrandIcon name="maven central" className="h-3 w-3" />
                            Maven Central
                          </a>
                          <a
                            href="https://cocoapods.org/pods/AspectlyBridge"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
                          >
                            <BrandIcon name="cocoapods" className="h-3 w-3" />
                            CocoaPods
                          </a>
                          <a
                            href={`https://pub.dev/packages/aspectly_bridge/versions/${release.version}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-500/20 dark:text-sky-400"
                          >
                            <BrandIcon name="pub.dev" className="h-3 w-3" />
                            pub.dev
                          </a>
                          <a
                            href={`https://pypi.org/project/aspectly-bridge/${release.version}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400"
                          >
                            <BrandIcon name="pypi" className="h-3 w-3" />
                            PyPI
                          </a>
                          <a
                            href="https://github.com/JeanIsahakyan/aspectly?tab=readme-ov-file#supported-platforms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-orange-600/10 px-3 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-600/20 dark:text-orange-300"
                          >
                            <BrandIcon name="swiftpm" className="h-3 w-3" />
                            SwiftPM
                          </a>
                        </>
                      )}
                    </div>

                    <ul className="mt-5 space-y-3 border-t border-border pt-4">
                      {release.changes.map((change, i) => (
                        <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm">
                          <span
                            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeColors[change.type] || ''}`}
                          >
                            {typeLabels[change.type] || change.type}
                          </span>
                          <span className="w-20 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground/60">
                            {change.date}
                          </span>
                          <span className="flex-1 text-pretty pt-0.5 leading-relaxed text-muted-foreground">
                            {change.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>

        {!showAll && releases.length > INITIAL_COUNT && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-soft transition-colors hover:bg-muted"
            >
              Show {releases.length - INITIAL_COUNT} older releases
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <BlurFade delay={0.3} inView>
          <div className="mt-8 text-center">
            <a
              href="https://github.com/JeanIsahakyan/aspectly/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              View full changelog on GitHub
            </a>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
