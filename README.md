# Agricultural Store Billing & Inventory Management System (AgriStore)

A production-grade, offline-first desktop application designed specifically for Indian agricultural input retailers (fertilizer, pesticide, and seed dealers). Built with **Electron**, **React 19**, **TypeScript**, **Tailwind CSS**, and **SQLite (better-sqlite3)**.

---

## Key Highlights

- **100% Offline-First Architecture**: Operates completely offline without any internet connection. Local SQLite database is the sole, high-integrity source of truth.
- **Agricultural GST Invoicing**: Compliant with Indian GST rules for agricultural products (0% exempt seeds, 5% fertilizers, 18% chemicals/pesticides).
- **Batch & Expiry Tracking**: Mandatory batch number, manufacturing date, and expiry date management with alerts for expired or near-expiry batches.
- **Dealer Licensing Compliance**: Pesticide and fertilizer license tracking (DL numbers) automatically embedded in printed invoices.
- **Farmer Ledger & Credit (Khata)**: Complete khata management with credit limits, payment histories, and village-wise customer profiling.
- **Native Windows & Hardware Printing**:
  - **Native Windows Print Dialog (Ctrl+P)**: Default workflow allowing standard Windows printer selection and system dialog controls.
  - **Thermal Receipt Printing**: Specialized layouts for **80mm** (standard counter) and **58mm** (compact POS) thermal printers.
  - **Full-Sheet A4 Invoices**: Comprehensive GST tax invoices with banking details, terms, and dual dealer license numbers.
  - **Authentic PDF Export**: Standalone offscreen PDF generation (`%PDF-1.4`) that opens in all standard Windows PDF viewers (Edge, Adobe Acrobat, Chrome).
- **Adaptive Window Maximization**:
  - Automatically queries the active display's usable work area (respecting taskbars and DPI scaling).
  - Maximizes cleanly without hardcoded screen resolution limits.
  - Non-resizable window boundary prevents UI breakage during high-speed counter billing.
- **Counter Keybindings**:
  - `F1`: New Bill
  - `F2`: Focus Product Search
  - `F3`: Focus Customer Search
  - `F5`: Hold Current Bill (isolated from accidental page refresh)
  - `F6`: Retrieve Held Bills
  - `F9`: Save & Print Bill
  - `Escape`: Close Modals / Dropdowns
  - `Ctrl + S`: Save PDF from Print Modal
  - `Ctrl + P`: Open System Print Dialog

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | Electron 44 |
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool & Bundler** | Vite 8 + Tailwind CSS 4 |
| **Local Database** | SQLite via `better-sqlite3` |
| **Schema & Types** | Drizzle ORM |
| **State Management** | Zustand |
| **Icons & UI** | Lucide React |

---

## Project Structure

```
agri/
├── demo-data/                    # Packaged static assets
│   └── agricultural_demo.db     # Clean offline demo database (auto-seeded on first run)
├── electron/                     # Electron Main process & services
│   ├── main.ts                  # Window lifecycle, display workArea maximization
│   ├── preload.ts               # Secure context-isolated IPC bridge
│   ├── db/                      # SQLite connection, Drizzle schema & migrations
│   ├── ipc/                     # Business logic handlers (sales, inventory, customers)
│   └── services/                # Specialized services (pdfService, printingService)
├── src/                          # React Renderer process
│   ├── App.tsx                  # Global shortcut routing & navigation
│   ├── components/              # Shared UI cards, inputs, modals, and invoice templates
│   ├── pages/                   # POS Billing, Inventory, Customers, Purchases, Settings
│   ├── store/                   # Zustand stores (cart, auth, settings, theme)
│   └── types/                   # Unified TypeScript domain definitions
└── test/                         # Automated validation & verification suites
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Operating System**: Windows 10 / 11 (or macOS / Linux for development)
- **C++ Build Tools**: Required for native `better-sqlite3` compilation (`windows-build-tools` or Visual Studio C++ workload)

### Installation

1. Clone or extract the repository:
   ```bash
   git clone https://github.com/VishwasSK15/agri.git
   cd agri
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build Electron and Frontend bundles:
   ```bash
   npm run build
   ```

### Running the Application

- **Development Mode** (Vite HMR + Electron):
  ```bash
  npm run dev
  ```

- **Production Desktop Mode**:
  ```bash
  npm start
  ```

- **QA Mode** (uses isolated QA database in AppData):
  ```bash
  npm run start:qa
  ```

---

## Offline Demo Database & First-Run Experience

When launched for the first time on a fresh system where no local database exists, the application:
1. Detects that the user AppData database is absent.
2. Automatically copies the clean, pre-populated `demo-data/agricultural_demo.db` into the user's local AppData directory (`AppData/Roaming/AgriculturalBilling/agricultural.db`).
3. Operates exclusively on this local copy.

> [!NOTE]
> The packaged demo database in `demo-data/` remains completely immutable and unmodified. The application never requires an internet connection or remote database.

---

## Testing & Verification Suites

The repository includes comprehensive automated test suites verifying window mechanics, keyboard isolation, PDF generation, and demo data isolation:

```bash
# Verify window maximization, shortcuts, printer discovery, and PDF generation
npm run test:acceptance

# Full end-to-end acceptance run with browser and database assertions
npm run test:full

# Multi-scenario PDF export (A4, 80mm, 58mm) and demo DB immutability check
npm run test:pdf
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
