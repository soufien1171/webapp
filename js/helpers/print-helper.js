// Print Helper — Thermal receipt ticket generation

import { formatDinars } from './money-helper.js';
import { formatDateFR, formatTime } from './date-helper.js';

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/** Print a receipt ticket. */
export function printTicket(ticketData) {
    const {
        companyName = 'Mon Magasin',
        companyDesc = '',
        companyAddress = '',
        companyTel = '',
        invoiceNumber = '',
        date = formatDateFR(),
        time = formatTime(),
        items = [],
        totalQty = 0,
        totalPrice = 0,
        discount = 0,
        received = 0,
        change = 0
    } = ticketData;

    const finalPrice = totalPrice - discount;
    const itemsHtml = items.map(item => `
        <tr>
            <td class="ticket-item-name">${escapeHtml(item.name)}</td>
            <td class="ticket-item-qty">${escapeHtml(item.qty)}</td>
            <td class="ticket-item-price">${formatDinars(item.unitPrice)}</td>
            <td class="ticket-item-total">${formatDinars(item.total)}</td>
        </tr>
    `).join('');

    const discountHtml = discount > 0 ? `
        <div class="ticket-line">
            <span>Remise :</span>
            <span>-${formatDinars(discount)} DT</span>
        </div>
    ` : '';

    const ticketHtml = `
        <div class="print-ticket">
            <div class="ticket-header">
                <h2 class="ticket-company-name">${escapeHtml(companyName)}</h2>
                ${companyDesc ? `<p class="ticket-company-address">${escapeHtml(companyDesc)}</p>` : ''}
                ${companyTel ? `<p class="ticket-company-phone">${escapeHtml(companyTel)}</p>` : ''}
                ${companyAddress ? `<p class="ticket-company-address">${escapeHtml(companyAddress)}</p>` : ''}
            </div>
            <div class="ticket-divider"></div>
            <div class="ticket-info">
                <div class="ticket-line"><span>Ticket :</span><span>#${escapeHtml(invoiceNumber)}</span></div>
                <div class="ticket-line"><span>Date :</span><span>${escapeHtml(date)}</span></div>
                <div class="ticket-line"><span>Heure :</span><span>${escapeHtml(time)}</span></div>
            </div>
            <div class="ticket-divider"></div>
            <table class="ticket-items">
                <thead><tr><th>Article</th><th>Qté</th><th>P.U</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="ticket-divider"></div>
            <div class="ticket-totals">
                <div class="ticket-line"><span>Articles :</span><span>${totalQty}</span></div>
                <div class="ticket-line"><span>Total :</span><span>${formatDinars(totalPrice)} DT</span></div>
                ${discountHtml}
                <div class="ticket-line ticket-line-bold"><span>À payer :</span><span>${formatDinars(finalPrice)} DT</span></div>
                <div class="ticket-line"><span>Reçu :</span><span>${formatDinars(received)} DT</span></div>
                <div class="ticket-line"><span>Rendu :</span><span>${formatDinars(change)} DT</span></div>
            </div>
            <div class="ticket-divider"></div>
            <div class="ticket-footer">
                <div class="ticket-developer-info">
                    <p>SHARPPROG DESIGN DÉVELOPPEMENT</p>
                    <p>Mail:soufien17@hotmail.fr</p>
                    <p>Tel: 54.545.578--52.289.512</p>
                </div>
                <div class="ticket-developer-separator"></div>
                <p>MERCI DE VOTRE VISITE !</p>
                <p>À BIENTÔT</p>
            </div>
        </div>
    `;

    const printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    printContainer.className = 'print-ticket-wrapper';
    printContainer.innerHTML = ticketHtml;
    document.body.appendChild(printContainer);

    window.print();
    setTimeout(() => printContainer.remove(), 1000);
}
