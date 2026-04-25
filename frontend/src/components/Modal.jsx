function Modal({ open, title, onClose, children, width = "max-w-2xl" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className={`edv-glass-card w-full ${width} rounded-2xl p-5 shadow-2xl md:p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="edv-title-gradient text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="edv-btn-ghost rounded-lg px-3 py-1 text-sm font-semibold">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
