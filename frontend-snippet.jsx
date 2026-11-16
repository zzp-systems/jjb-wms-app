// ───────────────────────────────────────────────────────────
// WMS Frontend Snippet — ReceivingModule.jsx
// Add this to your existing ReceivingModule.jsx (or equivalent)
// in the jjb-wms-app project.
//
// This fires when a receiving report is marked as "Received"
// or "Complete", sending the data to z-books-systems to
// auto-create an AP invoice + GL entry.
//
// INTEGRATION POINT: Call syncToArap() inside your existing
// "mark as received" / "complete receiving" handler, right
// after the receiving report status is updated in D1.
// ───────────────────────────────────────────────────────────


// ── 1. Add this helper function near the top of ReceivingModule.jsx ──

/**
 * Syncs a completed receiving report to z-books-systems (ARAP)
 * to auto-create an AP invoice and GL journal entry.
 *
 * @param {string} receivingId   - The receiving report ID
 * @param {string} supplierName  - Supplier name from the receiving report
 * @param {number} totalAmount  - Total cost of received items (in pesos, not centavos)
 * @param {string} invoiceDate  - ISO date string (YYYY-MM-DD)
 * @param {string} [dueDate]    - Optional due date (defaults to invoice date + 30 days)
 * @param {string} [supplierId] - Optional supplier ID from WMS suppliers table
 */
async function syncToArap(receivingId, supplierName, totalAmount, invoiceDate, dueDate, supplierId) {
  const token = localStorage.getItem('jjb_wms_token'); // adjust to match your WMS token key

  try {
    const res = await fetch('/api/receiving-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiving_id: receivingId,
        supplier_name: supplierName,
        supplier_id: supplierId || null,
        total_amount: totalAmount,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
      }),
    });

    const data = await res.json();

    if (data.success) {
      console.log(`✅ AP Invoice created in z-books: ${data.ap_invoice_number}`);
      return data;
    } else {
      console.error('ARAP sync error:', data.error);
      return null;
    }
  } catch (err) {
    console.error('ARAP sync failed (network):', err.message);
    return null;
  }
}


// ── 2. Call syncToArap() inside your existing receiving completion handler ──
//
// Example — find the function in ReceivingModule.jsx that handles
// "Mark as Received" or "Complete Receiving" and add the sync call:

/*
async function handleCompleteReceiving(report) {
  // ... your existing code to update the receiving report status in D1 ...

  // ── ADD THIS: Sync to ARAP after successful completion ──
  const arapResult = await syncToArap(
    report.id,                    // receiving report ID
    report.supplier_name,         // supplier name
    report.total_cost,            // total amount in pesos
    report.receiving_date,        // invoice date (YYYY-MM-DD)
    undefined,                    // due date (optional — defaults to invoice date)
    report.supplier_id            // supplier ID (optional)
  );

  if (arapResult?.success) {
    // Optionally show a success message to the user
    alert(`Receiving complete. AP Invoice ${arapResult.ap_invoice_number} created in z-books.`);
  } else {
    // Sync failed but receiving is still complete — show warning
    alert('Receiving complete, but ARAP sync failed. Check console for details.');
  }
}
*/


// ── 3. Alternative: If your receiving completion is a button click ──
/*
<button onClick={() => handleCompleteReceiving(selectedReport)}>
  Mark as Received
</button>
*/
