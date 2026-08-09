import { PropsWithChildren } from "react";

export interface ExternalLinkProps {
  href: string;
}

export const ExternalLink = ({
  href,
  children,
}: PropsWithChildren<ExternalLinkProps>) => {
  return (
    <a className="text-primary hover:underline" target="_new" href={href}>
      {children}
    </a>
  );
};
