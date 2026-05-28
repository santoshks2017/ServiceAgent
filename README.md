# Dealer Campaign Portal - Web Prototype

A client-facing dashboard prototype for CarDekho NCBD dealers to monitor their Google Ads campaigns, budget utilization, and optimizations.

## Stack
- **HTML**: Core semantic structure.
- **CSS**: Vanilla CSS for styling (glassmorphic dark theme, responsive grid/flexbox, native transitions).
- **JavaScript**: Vanilla JS for logic, custom canvas-based line and bar charts, simulators, state management.
- **Build / Run**: Vite dev server.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the local development server**:
   ```bash
   npm run dev
   ```

3. **Demographics for Evaluation**:
   To test the OTP login page, enter one of the registered demo mobile numbers:
   - **Apex Hyundai Group**: `9876543210` (OTP: `123456`)
   - **Sethi Mahindra Motors**: `9123456789` (OTP: `654321`)

4. **Interactive Controls Panel**:
   Click the float laboratory flask button **🧪** in the bottom-right corner to open the Simulator Controls Panel:
   - **📲 Send WhatsApp report notification**: Simulates receipt of monthly report WhatsApp alerts. Clicking on the toast redirects directly to the reports tab!
   - **💬 Simulate Account Manager reply**: Adds a message to the active chat box with a loading typing indicator.
   - **⚙️ Advance Ticket status**: Updates any registered support ticket from "Open" to "In Review" or "Resolved".
   - **⚠️ Trigger High CPL alert**: Increases Noida campaign average CPL to exceed committed limits, updating the status indicators to red.
