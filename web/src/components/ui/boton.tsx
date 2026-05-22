import Link from "next/link";
import { clasesCondicionales } from "@/lib/utilidades";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";
type Tamano = "sm" | "md" | "lg";

const estilosBase =
  "inline-flex items-center justify-center font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed";

const estilosVariante: Record<Variante, string> = {
  primario: "bg-brand-600 hover:bg-brand-700 text-white",
  secundario: "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700",
  peligro: "bg-red-600 hover:bg-red-700 text-white",
  fantasma: "hover:bg-neutral-900 text-neutral-300 hover:text-white",
};

const estilosTamano: Record<Tamano, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

type PropsBoton = {
  variante?: Variante;
  tamano?: Tamano;
  className?: string;
  children: React.ReactNode;
} & (
  | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href">)
  | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

export function Boton({
  variante = "primario",
  tamano = "md",
  className,
  children,
  ...props
}: PropsBoton) {
  const clases = clasesCondicionales(
    estilosBase,
    estilosVariante[variante],
    estilosTamano[tamano],
    className
  );

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={clases} {...rest}>
        {children}
      </Link>
    );
  }

  const { href: _, ...rest } = props as React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
  return (
    <button className={clases} {...rest}>
      {children}
    </button>
  );
}
