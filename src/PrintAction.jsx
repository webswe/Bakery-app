import React, { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";

export default function PrintAction({ className = "secondary no-print", disabled = false, children = "Preview & print" }) {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (preview) document.documentElement.dataset.printPreview = "true";
    else delete document.documentElement.dataset.printPreview;
    return () => delete document.documentElement.dataset.printPreview;
  }, [preview]);
  return <><button type="button" className={className} disabled={disabled} onClick={() => setPreview(true)}><Printer size={15} />{children}</button>{preview && <div className="print-preview-toolbar no-print" role="dialog" aria-modal="true" aria-label="Print preview controls"><span><b>Print preview</b><small>Check page breaks and content below before opening the Windows print dialog.</small></span><button className="primary" onClick={() => window.print()}><Printer size={15} />Print / Save PDF</button><button className="icon-button" onClick={() => setPreview(false)} aria-label="Close print preview"><X size={18} /></button></div>}</>;
}
