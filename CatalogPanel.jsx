import React from "react";
import "./catalog-panel.css";

export default function CatalogPanel({expanded,children}){
  return <section className={expanded ? "catalog panel wide" : "catalog panel"}>{children}</section>;
}
