// path: components/inventory/ItemLineEditor.jsx

"use client";

import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";

export default function ItemLineEditor({ lines, setLines, showUnitCost }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [activeRow, setActiveRow] = useState(null);

  async function handleSearch(query) {
    setSearch(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(
      `/api/inventory/register/search?q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    setResults(data.items || []);
  }

  function addLine() {
    setLines([
      ...lines,
      {
        inventory_item_id: "",
        item_label: "",
        quantity: "",
        uom: "",
        unit_cost: "",
      },
    ]);
  }

  function selectItem(rowIndex, item) {
    const updated = [...lines];
    updated[rowIndex] = {
      ...updated[rowIndex],
      inventory_item_id: item.id,
      item_label: `${item.code} — ${item.name}`,
      uom: item.uom || "",
    };
    setLines(updated);
    setActiveRow(null);
    setSearch("");
    setResults([]);
  }

  function updateLine(index, field, value) {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  }

  function removeLine(index) {
    setLines(lines.filter((_, i) => i !== index));
  }

  return (
    <div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-2 px-3">Item</th>
            <th className="w-28">Qty</th>
            <th className="w-24">UOM</th>
            {showUnitCost && <th className="w-28">Unit Cost</th>}
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b relative">
              <td className="py-2 px-3">
                {line.item_label ? (
                  <div className="flex items-center justify-between">
                    <span>{line.item_label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateLine(i, "inventory_item_id", "") ||
                        updateLine(i, "item_label", "")
                      }
                      className="text-xs text-slate-400"
                    >
                      change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      placeholder="Search item code or name..."
                      value={activeRow === i ? search : ""}
                      onFocus={() => setActiveRow(i)}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full border rounded-md px-2 py-1"
                    />
                    {activeRow === i && results.length > 0 && (
                      <div className="absolute z-10 bg-white border rounded-md shadow-md mt-1 w-72 max-h-48 overflow-y-auto">
                        {results.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => selectItem(i, item)}
                            className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b last:border-0"
                          >
                            <span className="font-mono text-slate-400">
                              {item.code}
                            </span>{" "}
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td>
                <input
                  type="number"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  className="w-full border rounded-md px-2 py-1"
                  required
                />
              </td>
              <td>
                <input
                  value={line.uom}
                  onChange={(e) => updateLine(i, "uom", e.target.value)}
                  className="w-full border rounded-md px-2 py-1"
                />
              </td>
              {showUnitCost && (
                <td>
                  <input
                    type="number"
                    step="any"
                    value={line.unit_cost}
                    onChange={(e) => updateLine(i, "unit_cost", e.target.value)}
                    className="w-full border rounded-md px-2 py-1"
                  />
                </td>
              )}
              <td>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="p-1 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addLine}
        className="flex items-center gap-1 text-sm text-blue-600 mt-2"
      >
        <Plus size={14} /> Add Line
      </button>
    </div>
  );
}
