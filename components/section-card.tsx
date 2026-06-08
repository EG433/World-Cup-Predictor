import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  eyebrow,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      {(eyebrow || description) && (
        <div className="section-card-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <div>
            <h2>{title}</h2>
            {description ? <p className="muted-text">{description}</p> : null}
          </div>
        </div>
      )}

      {!eyebrow && !description ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}
