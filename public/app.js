document.addEventListener("DOMContentLoaded", () => {

  console.log("APP JS LOADED");

  // ⭐ GLOBAL LOADING + TOAST HELPERS
  function showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden");
  }

  function hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // NAVIGATION
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const page = item.dataset.page;
      pages.forEach(p => p.classList.remove("active"));
      document.getElementById(page).classList.add("active");
      if (page === "dashboardPage") {
        loadDashboard();
      }
    });
  });

  // ⭐ DASHBOARD BUTTON → GO TO CREATE INVOICE
  document.getElementById("goToCreateInvoice").addEventListener("click", () => {
    // Update sidebar highlight
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector('[data-page="invoicePage"]').classList.add("active");

    // Switch page
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("invoicePage").classList.add("active");
  });

  // ⭐ GLOBAL LOGO VARIABLE
  let uploadedLogo = null;

  // AUTH STATE
  auth.onAuthStateChanged(user => {
    if (user) {
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("userEmail").textContent = user.email;

      loadInvoices(user.uid);
      loadClients(user.uid);
      loadUserLogo(user.uid);
      loadDashboard();
    } else {
      window.location.href = "login.html";
    }
  });

  // ⭐ CLIENT AUTOFILL (GLOBAL, FIXED)
  function fillClientFields() {
    const select = document.getElementById("clientSelect");
    const option = select.options[select.selectedIndex];

    if (!option || !option.dataset) return;

    document.getElementById("clientName").value = option.dataset.name || "";
    document.getElementById("clientEmail").value = option.dataset.email || "";
    document.getElementById("clientAddress").value = option.dataset.address || "";
    document.getElementById("clientPhone").value = option.dataset.phone || "";
    document.getElementById("clientCompany").value = option.dataset.company || "";
    document.getElementById("clientNotes").value = option.dataset.notes || "";
  }

  document.getElementById("clientSelect").addEventListener("change", fillClientFields);

  // ⭐ LOAD USER LOGO
  function loadUserLogo(userId) {
    db.collection("users")
      .doc(userId)
      .collection("branding")
      .doc("logo")
      .get()
      .then(doc => {
        if (doc.exists) {
          uploadedLogo = doc.data().data;

          const preview = document.getElementById("logoPreview");
          preview.src = uploadedLogo;
          preview.style.display = "block";
        }
      })
      .catch(err => console.error("Error loading logo:", err));
  }

  // ⭐ SAVE LOGO
  document.getElementById("logoUpload").addEventListener("change", async (e) => {
    const user = auth.currentUser;
    if (!user) return;

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      uploadedLogo = reader.result;

      const preview = document.getElementById("logoPreview");
      preview.src = uploadedLogo;
      preview.style.display = "block";

      try {
        await db
          .collection("users")
          .doc(user.uid)
          .collection("branding")
          .doc("logo")
          .set({ data: uploadedLogo });

        console.log("Logo saved to Firestore");
      } catch (error) {
        console.error("Error saving logo:", error);
      }
    };

    reader.readAsDataURL(file);
  });

  // ⭐ UPDATE CLIENT (FIXED: listener moved outside)
  async function updateClient() {
    const user = auth.currentUser;
    if (!user) return;

    const id = document.getElementById("editClientModal").dataset.id;

    const updatedData = {
      name: document.getElementById("editClientName").value.trim(),
      email: document.getElementById("editClientEmail").value.trim(),
      address: document.getElementById("editClientAddress").value.trim(),
      phone: document.getElementById("editClientPhone").value.trim(),
      company: document.getElementById("editClientCompany").value.trim(),
      notes: document.getElementById("editClientNotes").value.trim()
    };

    try {
      await db
        .collection("users")
        .doc(user.uid)
        .collection("clients")
        .doc(id)
        .update(updatedData);

      showToast("Client updated!");

loadClients(user.uid);

      document.getElementById("editClientModal").classList.add("hidden");

    } catch (error) {
      console.error("Error updating client:", error);
      showToast("Failed to update client.");
    }
  }
document.getElementById("updateClientBtn").addEventListener("click", updateClient);
  
  async function loadDashboard() {
    const user = auth.currentUser;
    if (!user) return;

    const invoicesRef = db.collection("invoices")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc");

    const snapshot = await invoicesRef.get();

    let totalInvoices = 0;
    let unpaidTotal = 0;
    let paidTotal = 0;

    const recentInvoicesContainer = document.getElementById("recentInvoices");
    recentInvoicesContainer.innerHTML = "";

    snapshot.forEach((doc, index) => {
      const inv = doc.data();
      totalInvoices++;

      if (inv.status === "paid") {
        paidTotal += inv.total || 0;
      } else {
        unpaidTotal += inv.total || 0;
      }

      // Only show first 5 invoices
      if (index < 5) {
        const div = document.createElement("div");
        div.classList.add("recent-invoice-item");
        div.innerHTML = `
        <strong>${inv.projectName || "Untitled"}</strong>
        <span>$${(inv.total || 0).toFixed(2)}</span>
        <span>${inv.status || "unpaid"}</span>
      `;
        recentInvoicesContainer.appendChild(div);
      }
    });

    // Update KPI cards
    document.getElementById("kpiTotalInvoices").textContent = totalInvoices;
    document.getElementById("kpiUnpaidTotal").textContent = `$${unpaidTotal.toFixed(2)}`;
    document.getElementById("kpiPaidTotal").textContent = `$${paidTotal.toFixed(2)}`;
  }

  // INVOICE GENERATOR LOGIC
  const itemsBody = document.getElementById("itemsBody");
  const addItemBtn = document.getElementById("addItemBtn");
  const taxRateInput = document.getElementById("taxRate");
  const subtotalDisplay = document.getElementById("subtotalDisplay");
  const taxDisplay = document.getElementById("taxDisplay");
  const totalDisplay = document.getElementById("totalDisplay");

  function formatCurrency(value) {
    return "$" + value.toFixed(2);
  }

  function recalcTotals() {
    let subtotal = 0;

    itemsBody.querySelectorAll("tr").forEach(row => {
      const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
      const rate = parseFloat(row.querySelector(".item-rate").value) || 0;
      const amount = qty * rate;
      row.querySelector(".item-amount").textContent = formatCurrency(amount);
      subtotal += amount;
    });

    const taxRate = parseFloat(taxRateInput.value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    subtotalDisplay.textContent = formatCurrency(subtotal);
    taxDisplay.textContent = formatCurrency(tax);
    totalDisplay.textContent = formatCurrency(total);
  }

  function attachRowEvents(row) {
    row.querySelectorAll(".item-qty, .item-rate").forEach(input => {
      input.addEventListener("input", recalcTotals);
    });

    row.querySelector(".remove-item-btn").addEventListener("click", () => {
      if (itemsBody.querySelectorAll("tr").length > 1) {
        row.remove();
        recalcTotals();
      }
    });
  }

  // initial row
  itemsBody.querySelectorAll("tr").forEach(attachRowEvents);

  addItemBtn.addEventListener("click", () => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" class="item-desc" placeholder="e.g. 5 TikTok videos" /></td>
      <td><input type="number" class="item-qty" value="1" min="1" /></td>
      <td><input type="number" class="item-rate" value="0" min="0" step="0.01" /></td>
      <td class="item-amount">$0.00</td>
      <td><button class="remove-item-btn">✕</button></td>
    `;
    itemsBody.appendChild(row);
    attachRowEvents(row);
    recalcTotals();
  });

  taxRateInput.addEventListener("input", recalcTotals);

  // ⭐ SAVE INVOICE BUTTON
  document.getElementById("saveInvoiceBtn").addEventListener("click", saveInvoice);

  // ⭐ PDF BUTTON
  document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
    const invoice = buildInvoiceFromForm("DRAFT");
    generatePDF(invoice);
  });

  // ⭐ MODAL PDF BUTTON
  document.getElementById("modalPdfBtn").addEventListener("click", async () => {
    const id = document.getElementById("invoiceModal").dataset.id;
    if (!id) return;

    const docSnap = await db.collection("invoices").doc(id).get();
    if (!docSnap.exists) return;

    generatePDF(docSnap.data());
  });

  // ⭐ BUILD INVOICE OBJECT
  function buildInvoiceFromForm(invoiceNumber) {
    const items = [];

    document.querySelectorAll("#itemsBody tr").forEach(row => {
      const desc = row.querySelector(".item-desc").value;
      const qty = parseFloat(row.querySelector(".item-qty").value);
      const rate = parseFloat(row.querySelector(".item-rate").value);
      const amount = qty * rate;

      if (desc.trim() !== "") {
        items.push({ desc, qty, rate, amount });
      }
    });

    return {
      invoiceNumber,
      clientName: document.getElementById("clientName").value,
      clientEmail: document.getElementById("clientEmail").value,
      clientAddress: document.getElementById("clientAddress").value,
      clientPhone: document.getElementById("clientPhone").value,
      clientCompany: document.getElementById("clientCompany").value,
      projectName: document.getElementById("projectName").value,
      items,
      subtotal: parseFloat(subtotalDisplay.textContent.replace("$", "")),
      taxAmount: parseFloat(taxDisplay.textContent.replace("$", "")),
      total: parseFloat(totalDisplay.textContent.replace("$", "")),
      logo: uploadedLogo || null
    };
  }

  // ⭐ PDF GENERATION
  async function generatePDF(invoice) {
    const wrapper = document.getElementById("pdfWrapper");
    const printArea = document.getElementById("printArea");

    // ⭐ Show wrapper so html2canvas can capture it
    wrapper.style.display = "block";

    printArea.innerHTML = `

  <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 750px; margin: auto;">

    <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 35px;">
      <div>
        ${invoice.logo 
          ? `<img src="${invoice.logo}" style="height: 70px; object-fit: contain;" />`
          : `<h1 style="margin: 0; color: #4f46e5; font-size: 28px;">INVOICE</h1>`
        }
      </div>

      <div style="text-align: right;">
        <h2 style="margin: 0; color: #4f46e5; font-size: 24px;">Invoice #${invoice.invoiceNumber}</h2>
        <p style="margin: 5px 0 0; font-size: 14px; color: #555;">
          ${new Date().toLocaleDateString()}
        </p>
      </div>
    </div>

    <!-- CLIENT INFO -->
    <div style="margin-bottom: 30px;">
${invoice.clientCompany ? `<p style="margin: 2px 0; font-size: 15px;"><strong>${invoice.clientCompany}</strong></p>` : ""}
      <h3 style="color: #4f46e5; margin-bottom: 10px; font-size: 18px;">Bill To</h3>
      <p style="margin: 2px 0; font-size: 15px;"><strong>${invoice.clientName}</strong></p>
<p style="margin: 2px 0; font-size: 14px;">${invoice.clientEmail}</p>

${invoice.clientAddress ? `<p style="margin: 2px 0; font-size: 14px;">${invoice.clientAddress}</p>` : ""}

${invoice.clientPhone ? `<p style="margin: 2px 0; font-size: 14px;">${invoice.clientPhone}</p>` : ""}

<p style="margin: 2px 0; font-size: 14px;">Project: ${invoice.projectName}</p>

    </div>

    <!-- SERVICES TABLE -->
    <h3 style="color: #4f46e5; margin-bottom: 10px; font-size: 18px;">Services</h3>

    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr>
          <th style="padding: 10px; border-bottom: 2px solid #4f46e5; text-align: left;">Description</th>
          <th style="padding: 10px; border-bottom: 2px solid #4f46e5; text-align: center;">Qty</th>
          <th style="padding: 10px; border-bottom: 2px solid #4f46e5; text-align: center;">Rate</th>
          <th style="padding: 10px; border-bottom: 2px solid #4f46e5; text-align: right;">Amount</th>
        </tr>
      </thead>

      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td style="padding: 8px 0; font-size: 14px;">${item.desc}</td>
            <td style="text-align: center; font-size: 14px;">${item.qty}</td>
            <td style="text-align: center; font-size: 14px;">$${item.rate}</td>
            <td style="text-align: right; font-size: 14px;">$${item.amount.toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div style="margin-top: 40px; width: 260px; margin-left: auto; font-size: 15px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Subtotal:</span>
        <strong>$${invoice.subtotal.toFixed(2)}</strong>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Tax:</span>
        <strong>$${invoice.taxAmount.toFixed(2)}</strong>
      </div>

      <div style="border-top: 2px solid #4f46e5; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 18px;">
        <span>Total:</span>
        <strong>$${invoice.total.toFixed(2)}</strong>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #777;">
      Thank you for your business.
    </div>

  </div>
`;

    await new Promise(resolve => setTimeout(resolve, 50));
    const options = {
      margin: 10,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

// Open the tab immediately to avoid popup blocking
const newTab = window.open("", "_blank");

// Write the invoice HTML into the new tab
newTab.document.write(`
  <html>
    <head>
      <title>Generating PDF...</title>
    </head>
    <body>${printArea.innerHTML}</body>
  </html>
`);
newTab.document.close();

// Generate PDF from the new tab's DOM
const pdfArray = await html2pdf()
  .from(newTab.document.body)
  .set(options)
  .outputPdf('arraybuffer');

// Convert to Blob
const pdfBlob = new Blob([pdfArray], { type: "application/pdf" });
const pdfUrl = URL.createObjectURL(pdfBlob);

// Redirect the new tab to the PDF
newTab.location.href = pdfUrl;


    // ⭐ Hide wrapper again
    wrapper.style.display = "none";
  }

  // ⭐ SAVE INVOICE
  async function saveInvoice() {
    const user = auth.currentUser;
    if (!user) {
      showToast("You must be logged in to save invoices.");
      return;
    }

    const counterRef = db
      .collection("users")
      .doc(user.uid)
      .collection("meta")
      .doc("invoiceCounter");

    const nextNumber = await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(counterRef);

      let newNumber = 1;

      if (docSnap.exists) {
        newNumber = docSnap.data().lastNumber + 1;
      }

      transaction.set(counterRef, { lastNumber: newNumber }, { merge: true });

      return newNumber;
    });

    const paddedNumber = String(nextNumber).padStart(4, "0");

    const invoice = buildInvoiceFromForm(paddedNumber);
    invoice.userId = user.uid;
    invoice.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
      showLoading();
      await db.collection("invoices").add(invoice);
      hideLoading();
      showToast(`Invoice #${paddedNumber} saved!`);

      clearInvoiceForm();
    } catch (error) {
      console.error("Error saving invoice:", error);
      hideLoading();
      showToast("Failed to save invoice.");
    }
  }

  // CLEAR FORM
  function clearInvoiceForm() {
    document.getElementById("clientName").value = "";
    document.getElementById("clientEmail").value = "";
    document.getElementById("clientAddress").value = "";
    document.getElementById("clientPhone").value = "";
    document.getElementById("clientCompany").value = "";
    document.getElementById("clientNotes").value = "";
    document.getElementById("projectName").value = "";
    document.getElementById("taxRate").value = 0;

    itemsBody.innerHTML = `
      <tr>
        <td><input type="text" class="item-desc" placeholder="e.g. 10 Instagram posts" /></td>
        <td><input type="number" class="item-qty" value="1" min="1" /></td>
        <td><input type="number" class="item-rate" value="0" min="0" step="0.01" /></td>
        <td class="item-amount">$0.00</td>
        <td><button class="remove-item-btn">✕</button></td>
      </tr>
    `;

    itemsBody.querySelectorAll("tr").forEach(attachRowEvents);
    recalcTotals();
  }

  // ⭐ SAVE CLIENT
  document.getElementById("saveClientBtn_clients").addEventListener("click", saveClient);

async function saveClient() {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("clientName_clients").value.trim();
  const email = document.getElementById("clientEmail_clients").value.trim();
  const address = document.getElementById("clientAddress_clients").value.trim();
  const phone = document.getElementById("clientPhone_clients").value.trim();

  if (!name || !email) {
    showToast("Client name and email are required.");
    return;
  }

  try {
    await db
      .collection("users")
      .doc(user.uid)
      .collection("clients")
      .add({
        name,
        email,
        address,
        phone,
        company: document.getElementById("clientCompany_clients").value.trim(),
        notes: document.getElementById("clientNotes_clients").value.trim()
      });

    showToast("Client saved!");
    loadClients(user.uid);

    // Clear fields
    document.getElementById("clientName_clients").value = "";
    document.getElementById("clientEmail_clients").value = "";
    document.getElementById("clientAddress_clients").value = "";
    document.getElementById("clientPhone_clients").value = "";
    document.getElementById("clientCompany_clients").value = "";
    document.getElementById("clientNotes_clients").value = "";

  } catch (error) {
    console.error("Error saving client:", error);
    showToast("Failed to save client.");
  }
}

  // ⭐ LOAD CLIENTS
  function loadClients(userId) {
    const clientSelect = document.getElementById("clientSelect");
    const clientList = document.getElementById("clientList");

    clientSelect.innerHTML = `<option value="">Select saved client</option>`;
    clientList.innerHTML = "";

    db.collection("users")
      .doc(userId)
      .collection("clients")
      .orderBy("name")
      .onSnapshot(snapshot => {

        // Reset UI
        clientSelect.innerHTML = `<option value="">Select saved client</option>`;
        clientList.innerHTML = "";


        // ⭐ APPLY SORTING BEFORE RENDERING
        const sortValue = document.getElementById("clientSort").value;

        let clientsArray = [];
        snapshot.forEach(doc => {
          clientsArray.push({ id: doc.id, data: doc.data() });
        });

        // Sort alphabetically
        clientsArray.sort((a, b) => {
          const nameA = a.data.name.toLowerCase();
          const nameB = b.data.name.toLowerCase();

          if (sortValue === "az") return nameA.localeCompare(nameB);
          if (sortValue === "za") return nameB.localeCompare(nameA);
          return 0;
        });

        // ⭐ RENDER SORTED CLIENTS
        clientsArray.forEach(({ id, data: c }) => {

          // Dropdown
          clientSelect.innerHTML += `
          <option 
            value="${id}" 
            data-name="${c.name}" 
            data-email="${c.email}"
            data-address="${c.address || ''}"
            data-phone="${c.phone || ''}"
            data-company="${c.company || ''}"
            data-notes="${c.notes || ''}"
          >
            ${c.name}
          </option>
        `;

          // List item
          clientList.innerHTML += `
          <div class="client-item">
            <div class="client-info">
              <strong>${c.name}</strong>
              <span>${c.email}</span>
              ${c.company ? `<span>${c.company}</span>` : ""}
            </div>

            <div class="client-actions">
              <span class="notes-icon" data-notes="${c.notes || ''}">🛈</span>
              <button class="edit-client-btn" data-id="${id}">✎</button>
              <button class="delete-client-btn" data-id="${id}">🗑️</button>
            </div>
          </div>
        `;
        });

        // ⭐ DELETE CLIENT (AFTER rendering)
        document.querySelectorAll(".delete-client-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.id;

            if (!confirm("Delete this client? This cannot be undone.")) return;

            try {
              await db
                .collection("users")
                .doc(userId)
                .collection("clients")
                .doc(id)
                .delete();

              showToast("Client deleted!");
            } catch (error) {
              console.error("Error deleting client:", error);
              showToast("Failed to delete client.");
            }
          });
        });

        // ⭐ EDIT CLIENT (AFTER rendering)
        document.querySelectorAll(".edit-client-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.id;

            const docSnap = await db
              .collection("users")
              .doc(userId)
              .collection("clients")
              .doc(id)
              .get();

            if (!docSnap.exists) return;

            const c = docSnap.data();

            document.getElementById("editClientName").value = c.name || "";
            document.getElementById("editClientEmail").value = c.email || "";
            document.getElementById("editClientAddress").value = c.address || "";
            document.getElementById("editClientPhone").value = c.phone || "";
            document.getElementById("editClientCompany").value = c.company || "";
            document.getElementById("editClientNotes").value = c.notes || "";

            document.getElementById("editClientModal").dataset.id = id;
            document.getElementById("editClientModal").classList.remove("hidden");
          });
        });

      });
  }

  // ⭐ LOAD INVOICES (NEW FUNCTION)
  function loadInvoices(userId) {
    const invoiceList = document.getElementById("invoiceList");
    invoiceList.innerHTML = "";

    db.collection("invoices")
      .where("userId", "==", userId)
      .onSnapshot(snapshot => {

        // ⭐ APPLY SORTING
        const sortValue = document.getElementById("invoiceSort").value;

        let invoicesArray = [];
        snapshot.forEach(doc => {
          invoicesArray.push({ id: doc.id, data: doc.data() });
        });

        // ⭐ SORT LOGIC
        invoicesArray.sort((a, b) => {
          const invA = a.data;
          const invB = b.data;

          if (sortValue === "newest") {
            return (invB.createdAt?.seconds || 0) - (invA.createdAt?.seconds || 0);
          }

          if (sortValue === "oldest") {
            return (invA.createdAt?.seconds || 0) - (invB.createdAt?.seconds || 0);
          }

          if (sortValue === "paid") {
            return (invB.status === "paid") - (invA.status === "paid");
          }

          if (sortValue === "unpaid") {
            return (invA.status === "paid") - (invB.status === "paid");
          }

          return 0;
        });

        // ⭐ RENDER SORTED INVOICES
        invoiceList.innerHTML = "";

        invoicesArray.forEach(({ id, data: inv }) => {
          const div = document.createElement("div");
          div.classList.add("invoice-item");

          div.innerHTML = `
          <div class="invoice-info">
            <strong>${inv.projectName || "Untitled Invoice"}</strong>
            <span>$${(inv.total || 0).toFixed(2)}</span>
            <span class="${inv.status}">${inv.status}</span>
          </div>

          <button class="view-invoice-btn" data-id="${id}">View</button>
        `;

          invoiceList.appendChild(div);

          // ⭐ VIEW INVOICE BUTTON LOGIC
          div.querySelector(".view-invoice-btn").addEventListener("click", async () => {
            const docSnap = await db.collection("invoices").doc(id).get();
            if (!docSnap.exists) return;

            const invData = docSnap.data();

            const modalBody = document.getElementById("modalBody");
            modalBody.innerHTML = `
  <p><strong>Project:</strong> ${invData.projectName || ""}</p>
  <p><strong>Client:</strong> ${invData.clientName || ""}</p>
  <p><strong>Total:</strong> $${(invData.total || 0).toFixed(2)}</p>
`;

            document.getElementById("invoiceModal").dataset.id = id;
            document.getElementById("invoiceModal").classList.remove("hidden");

          });
        });
      });
  }   // 

  // ⭐ NOTES TOOLTIP LOGIC
  const notesTooltip = document.getElementById("notesTooltip");

  document.addEventListener("mouseover", (e) => {
    if (e.target.classList.contains("notes-icon")) {
      const notes = e.target.dataset.notes || "No notes";

      notesTooltip.textContent = notes;
      notesTooltip.classList.remove("hidden");

      const rect = e.target.getBoundingClientRect();
      notesTooltip.style.top = rect.top + window.scrollY - 10 + "px";
      notesTooltip.style.left = rect.left + window.scrollX + 25 + "px";

      requestAnimationFrame(() => {
        notesTooltip.classList.add("show");
      });
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.classList.contains("notes-icon")) {
      notesTooltip.classList.remove("show");
      setTimeout(() => {
        notesTooltip.classList.add("hidden");
      }, 150);
    }
  });

  // ⭐ CLIENT SEARCH FILTER
  document.getElementById("clientSearch").addEventListener("input", () => {
    const query = document.getElementById("clientSearch").value.toLowerCase();
    const items = document.querySelectorAll("#clientList .client-item");

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? "block" : "none";
    });
  });

  // ⭐ INVOICE SORT DROPDOWN
  document.getElementById("invoiceSort").addEventListener("change", () => {
    const user = auth.currentUser;
    if (user) loadInvoices(user.uid);
  });

  // CLOSE MODAL
  document.getElementById("closeModal").addEventListener("click", () => {
    // prevent reopening
    document.getElementById("invoiceModal").classList.add("hidden");
  });

  // CLOSE MODAL WHEN CLICKING BACKGROUND
  document.getElementById("invoiceModal").addEventListener("click", (e) => {
    if (e.target.id === "invoiceModal") {
      document.getElementById("invoiceModal").classList.add("hidden");
    }
  });

  // ⭐ CLOSE EDIT CLIENT MODAL
  document.getElementById("closeEditClientModal").addEventListener("click", () => {
    document.getElementById("editClientModal").classList.add("hidden");
  });

  document.getElementById("editClientModal").addEventListener("click", (e) => {
    if (e.target.id === "editClientModal") {
      document.getElementById("editClientModal").classList.add("hidden");
    }
  });

  // LOGOUT
  document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.signOut().then(() => {
      window.location.href = "login.html";
    });
  });

});
