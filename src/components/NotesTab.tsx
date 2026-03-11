"use client";

import * as XLSX from "xlsx";

type NoteJobRow = {
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  dateAdded: string;
};

const notes: NoteJobRow[] = [];

export default function NotesTab() {
  const handleExport = () => {
    const headers = ["Job Title", "Company", "Location", "Salary", "URL", "Date Added"];
    const dataRows = notes.map((row) => [row.jobTitle, row.company, row.location, row.salary, row.url, row.dateAdded]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notes");
    XLSX.writeFile(workbook, "bloomve-notes.xlsx");
  };

  return (
    <section className="card card-3d p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Notes</h2>
        <button type="button" onClick={handleExport} className="btn-primary py-2 text-xs">
          Export to Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-rose-100/70 bg-white/70">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-rose-50/70">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-500">Job Title</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-500">Company</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-500">Location</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-500">Salary</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-500">URL</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-500">Date Added</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No jobs saved yet.
                </td>
              </tr>
            ) : (
              notes.map((row) => (
                <tr key={`${row.jobTitle}-${row.company}-${row.dateAdded}`} className="border-t border-rose-100/60">
                  <td className="px-4 py-3 text-slate-700">{row.jobTitle}</td>
                  <td className="px-4 py-3 text-slate-700">{row.company}</td>
                  <td className="px-4 py-3 text-slate-700">{row.location}</td>
                  <td className="px-4 py-3 text-slate-700">{row.salary}</td>
                  <td className="px-4 py-3 text-slate-700">{row.url}</td>
                  <td className="px-4 py-3 text-slate-700">{row.dateAdded}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
