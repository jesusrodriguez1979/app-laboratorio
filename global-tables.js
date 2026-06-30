// global-tables.js

// Helper para parsear fechas formato DD/MM/YYYY o DD/MM/YYYY, HH:mm:ss
function parseTableDate(str) {
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
  }
  // Fallback a parseo estandar
  const t = Date.parse(str);
  return isNaN(t) ? null : t;
}

document.addEventListener('DOMContentLoaded', () => {
  const tables = document.querySelectorAll('.custom-table');
  
  tables.forEach(table => {
    // 1. Setup State
    table._sortCol = -1; // index of th
    table._sortDir = 'asc';
    table._searchTerm = '';
    
    // 2. Setup Search Input if requested
    if(!table.hasAttribute('data-no-search') && !table.closest('.no-global-search')) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'padding: 15px; display:flex; justify-content:flex-end; align-items:center; border-bottom: 1px solid #334155; margin-bottom: 10px; background: rgba(0,0,0,0.1); border-radius: 8px;';
      wrapper.innerHTML = `<input type="text" class="form-control global-search-input" placeholder="Buscar en la tabla..." style="max-width: 300px; font-size:0.9rem;">`;
      
      // Prevent nesting inside table responsive wrappers if possible, but inserting before table works nicely.
      table.parentNode.insertBefore(wrapper, table);
      
      const input = wrapper.querySelector('input');
      input.addEventListener('input', () => {
        table._searchTerm = input.value;
        applyTableTransform(table);
      });
    }
    
    // 3. Setup TH clicks
    // Select headers from the LAST row of the thead to avoid colspan issues
    const ths = table.querySelectorAll('thead tr:last-child th');
    ths.forEach((th, idx) => {
      // Skip action columns usually
      if(th.textContent.trim().toLowerCase() === 'acciones' || th.hasAttribute('data-no-sort')) {
        return;
      }

      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.classList.add('global-sortable');
      
      // add span if not exists
      if(!th.querySelector('.sort-icon')) {
         th.innerHTML += ' <span class="sort-icon" style="font-size:0.8em; color:#94a3b8; margin-left: 5px;"></span>';
      }
      
      th.addEventListener('click', () => {
        if(table._sortCol === idx) {
          table._sortDir = table._sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          table._sortCol = idx;
          table._sortDir = 'asc';
        }
        applyTableTransform(table);
      });
    });
    
    // 4. MutationObserver to catch when tbody is updated by other scripts
    const tbody = table.querySelector('tbody');
    if(tbody) {
      const observer = new MutationObserver((mutations) => {
        // To prevent infinite loops when we sort the rows ourselves,
        // we use a flag
        if(!table._isTransforming) {
          // Re-apply sort and filter slightly deferred to let app.js finish rendering
          setTimeout(() => applyTableTransform(table), 10);
        }
      });
      observer.observe(tbody, { childList: true });
    }
  });
});

function applyTableTransform(table) {
  table._isTransforming = true; // prevent observer loop
  const tbody = table.querySelector('tbody');
  if(!tbody) { table._isTransforming = false; return; }
  
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Exclude rows that are just "empty state" messages (e.g. <td colspan="8">)
  const isDataRow = (row) => !(row.children.length === 1 && row.children[0].hasAttribute('colspan'));

  const dataRows = rows.filter(isDataRow);
  const emptyRows = rows.filter(r => !isDataRow(r));
  
  // Filtering
  const term = table._searchTerm.toLowerCase();
  dataRows.forEach(row => {
    if(!term) {
      row.style.display = '';
    } else {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    }
  });
  
  // Sorting
  if(table._sortCol !== -1 && dataRows.length > 0) {
    const visibleRows = dataRows.filter(r => r.style.display !== 'none');
    const hiddenRows = dataRows.filter(r => r.style.display === 'none');
    
    visibleRows.sort((a, b) => {
      const cellsA = Array.from(a.children);
      const cellsB = Array.from(b.children);
      if(!cellsA[table._sortCol] || !cellsB[table._sortCol]) return 0;
      
      const valA = cellsA[table._sortCol].textContent.trim();
      const valB = cellsB[table._sortCol].textContent.trim();
      
      const dateA = parseTableDate(valA);
      const dateB = parseTableDate(valB);
      
      let cmp = 0;
      if(dateA !== null && dateB !== null) {
        cmp = dateA - dateB;
      } else {
        cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      }
      
      return table._sortDir === 'asc' ? cmp : -cmp;
    });
    
    // Re-append
    tbody.innerHTML = '';
    visibleRows.forEach(r => tbody.appendChild(r));
    hiddenRows.forEach(r => tbody.appendChild(r)); // append hidden at bottom
    emptyRows.forEach(r => tbody.appendChild(r)); // empty rows stay at bottom
  } else {
    // If just filtering and NO sorting, we must still respect the DOM order but hide filtered rows.
    // However, if the tbody was just updated, the DOM order is correct.
    // We already updated row.style.display. No need to clear and re-append.
  }
  
  // Update icons
  const ths = table.querySelectorAll('thead tr:last-child th');
  ths.forEach((th, idx) => {
    const icon = th.querySelector('.sort-icon');
    if(icon) {
      if(idx === table._sortCol) {
        icon.innerHTML = table._sortDir === 'asc' ? ' &uarr;' : ' &darr;';
      } else {
        icon.innerHTML = '';
      }
    }
  });
  
  // Restore observer lock
  setTimeout(() => { table._isTransforming = false; }, 20);
}
