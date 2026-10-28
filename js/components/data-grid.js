// Data Grid Component (Interactive table with sorting & search filter)
export function createDataGrid({
    columns = [], // [{ key, label, render: (val, row) => html }]
    data = [],
    keyField = 'id',
    onRowClick = null,
    searchPlaceholder = "Rechercher...",
    rowClass = null
}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'data-grid-wrapper';

    let currentData = [...data];
    let sortKey = null;
    let sortAsc = true;
    let searchTerm = '';

    wrapper.innerHTML = `
        <div class="data-grid-toolbar flex flex-between mb-3 gap-2">
            <div class="input-with-icon flex-1" style="max-width: 320px;">
                <input type="text" class="form-input grid-search-input" placeholder="${searchPlaceholder}" />
            </div>
            <div class="grid-stats text-sm text-secondary self-center">
                <span class="grid-count">${data.length}</span> enregistrement(s)
            </div>
        </div>
        <div class="table-responsive card">
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `
                            <th data-key="${col.key}" class="cursor-pointer select-none">
                                ${col.label} <span class="sort-icon"></span>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody class="grid-tbody">
                </tbody>
            </table>
        </div>
    `;

    const tbody = wrapper.querySelector('.grid-tbody');
    const searchInput = wrapper.querySelector('.grid-search-input');
    const countLabel = wrapper.querySelector('.grid-count');

    function filterAndSort() {
        let result = [...data];

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(row => {
                return Object.values(row).some(v => String(v).toLowerCase().includes(term));
            });
        }

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];
                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });
        }

        currentData = result;
        countLabel.textContent = currentData.length;
        renderRows();
    }

    function renderRows() {
        if (currentData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${columns.length}" class="text-center py-6 text-muted">
                        Aucun enregistrement trouvé.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = currentData.map(row => {
            const extraClass = rowClass ? rowClass(row) : '';
            return `
                <tr class="grid-row ${extraClass}" data-id="${row[keyField] || ''}">
                    ${columns.map(col => {
                        const raw = row[col.key];
                        const content = col.render ? col.render(raw, row) : (raw !== undefined ? raw : '');
                        return `<td>${content}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');

        if (onRowClick) {
            tbody.querySelectorAll('.grid-row').forEach((tr, i) => {
                tr.addEventListener('click', () => onRowClick(currentData[i]));
            });
        }
    }

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim();
        filterAndSort();
    });

    wrapper.querySelectorAll('thead th').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (sortKey === key) {
                sortAsc = !sortAsc;
            } else {
                sortKey = key;
                sortAsc = true;
            }
            filterAndSort();
        });
    });

    renderRows();

    return {
        element: wrapper,
        setData: (newData) => {
            data = newData;
            filterAndSort();
        }
    };
}
