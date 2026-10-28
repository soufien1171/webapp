// Ticket Printer Component
import { printTicket } from '../helpers/print-helper.js';
import * as settingsRepo from '../db/repositories/settings-repo.js';

export async function printReceipt(facture, items, paymentInfo = {}) {
    const params = await settingsRepo.getParametres();

    printTicket({
        companyName: params.nom_ste || "Mon Magasin",
        companyDesc: params.desc_ste || "",
        companyAddress: params.adr_ste || "",
        companyTel: params.tel_ste || "",
        invoiceNumber: String(facture.id_fac || ''),
        date: facture.date_fac,
        time: facture.temp_fac,
        items: items.map(it => ({
            name: it.nom_vt,
            qty: it.quantite_vt,
            unitPrice: Number(it.pr2 || it.prix_vt) / 1000,
            total: Number(it.prix_vt) / 1000
        })),
        totalQty: items.reduce((acc, it) => acc + Number(it.quantite_vt), 0),
        totalPrice: Number(facture.prix_tt) / 1000,
        discount: Number(facture.remise || 0) / 1000,
        received: Number(facture.recue || paymentInfo.received || 0) / 1000,
        change: Number(paymentInfo.change || 0) / 1000
    });
}
