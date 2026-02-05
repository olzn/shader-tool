import type { ShaderTemplate } from '../types';
import { blankTemplate } from './blank';
import { swirlTemplate } from './swirl';
import { glowTemplate } from './glow';
import { sunflareTemplate } from './sunflare';

export const templates: ShaderTemplate[] = [
  blankTemplate,
  swirlTemplate,
  glowTemplate,
  sunflareTemplate,
];

export function getTemplate(id: string): ShaderTemplate | undefined {
  return templates.find(t => t.id === id);
}

export { blankTemplate, swirlTemplate, glowTemplate, sunflareTemplate };
