import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, X, ShieldAlert, Smartphone, Globe, ExternalLink, CheckCircle2 } from 'lucide-react';

interface NetworkHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkHelpModal: React.FC<NetworkHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative z-10 overflow-hidden border border-gray-100"
        >
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-700">
                  <WifiOff className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Warum streikt das Uni-WLAN (eduroam)?</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Hintergrund & Sofortlösungen für Uni-Netzwerke</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4">
                <p className="font-semibold text-amber-900 mb-1.5 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Ursache im Uni-Netzwerk:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800">
                  <li>
                    <strong>Strenge Firewall & Domain-Filter:</strong> Viele Hochschulen und eduroam-Access-Points blockieren oder drosseln dynamische Entwicklungsdomains von Cloud-Plattformen (wie <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">*.run.app</code> von Google Cloud).
                  </li>
                  <li>
                    <strong>Gesperrte WebSockets / Keep-Alive:</strong> Der Live-Entwicklungsserver nutzt Web-Sockets & Streaming. Viele Uni-Proxys kappen diese Verbindungen sofort.
                  </li>
                  <li>
                    <strong>TLS-Prüfung / Cookie-Filterung:</strong> Aggressive Hochschul-Proxys filtern manchmal Session-Cookies, wodurch die Anmeldung fehlschlägt.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-1">
                <h3 className="font-semibold text-gray-900 text-sm">Empfohlene Sofortlösungen:</h3>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="bg-blue-100 text-blue-700 p-2 rounded-xl shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-xs">1. Mobiler Hotspot (LTE / 5G)</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Schalte kurz deinen Smartphone-Hotspot ein. Da Mobilfunknetze keine Universitäts-Firewall haben, lädt die App dort sofort ohne Verzögerung.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-xs">2. VPN aktivieren</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ein VPN (z. B. <strong>Cloudflare WARP 1.1.1.1</strong>, Uni-eigenes Cisco AnyConnect oder ein privater VPN) umgeht die Domain-Blockade von eduroam zuverlässig.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="bg-purple-100 text-purple-700 p-2 rounded-xl shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-xs">3. Inkognito-Modus / Cache leeren</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Manchmal blockieren Uni-Zertifikate oder Browser-Erweiterungen (wie uBlock oder Privacy Badger) Cloud-Run-Ressourcen.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-blue-200"
              >
                Verstanden
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
