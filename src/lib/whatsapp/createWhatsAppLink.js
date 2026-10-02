import { WHATSAPP_TEMPLATES, fillTemplate } from "@/components/Chat/chatFlow";

export function createWhatsAppLink({
  number,
  templateKey,
  language,
  lead,
  projectName,
}) {
  const cleanNumber = String(number).replace(/\D/g, "");
  const template = WHATSAPP_TEMPLATES[templateKey]?.[language] ?? "";

  const message = fillTemplate(template, {
    first_name: lead.firstName,
    unit_type_label: lead.unitTypeLabel,
    company: lead.company,
    project_name: projectName,
  });

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
