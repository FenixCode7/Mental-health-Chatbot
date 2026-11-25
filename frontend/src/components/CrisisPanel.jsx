import { Close, Heart, Phone } from "./Icons.jsx";

export default function CrisisPanel({ resources, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <section className="modal crisis" role="alertdialog" aria-labelledby="crisis-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><Close /></button>
        <div className="crisis-icon"><Heart width="26" height="26" /></div>
        <h2 id="crisis-title">You don't have to go through this alone</h2>
        <p>
          If you're in immediate danger, please call your local emergency number now.
          These services are free, confidential and there for you 24/7.
        </p>
        <ul className="resource-list">
          {resources.map((r) => {
            const isLink = r.contact.startsWith("http");
            return (
              <li key={r.name}>
                <div>
                  <span className="resource-region">{r.region}</span>
                  <span className="resource-name">{r.name}</span>
                </div>
                {isLink ? (
                  <a className="resource-contact" href={r.contact} target="_blank" rel="noreferrer">findahelpline.com</a>
                ) : (
                  <span className="resource-contact"><Phone width="15" height="15" />{r.contact}</span>
                )}
              </li>
            );
          })}
        </ul>
        <button className="btn-primary wide" onClick={onClose}>Back to chat</button>
      </section>
    </div>
  );
}
