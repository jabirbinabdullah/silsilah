import * as d3 from 'd3';

export type GenealogyNodeDatum = {
  id: string;
  name: string;
  birthDate?: string | Date | null;
  deathDate?: string | Date | null;
  photoUrl?: string | null;
};

export type GenealogyNodeOptions = {
  cardWidth?: number;
  cardHeight?: number;
  onClick?: (id: string) => void;
  onToggle?: (id: string) => void;
  showToggle?: (d: d3.HierarchyPointNode<GenealogyNodeDatum>) => boolean;
  datesFormatter?: (birth?: string | Date | null, death?: string | Date | null) => string | null;
  detailLevel?: 'low' | 'medium' | 'high';
};

function defaultFormatDate(date?: string | Date | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric' });
}

export function renderGenealogyNode(
  selection: d3.Selection<SVGGElement, d3.HierarchyPointNode<GenealogyNodeDatum>, SVGGElement, unknown>,
  options: GenealogyNodeOptions = {}
): void {
  const cardWidth = options.cardWidth ?? 140;
  const cardHeight = options.cardHeight ?? 44;
  const detailLevel = options.detailLevel ?? 'high';

  const node = selection;

  // Background card
  node
    .append('rect')
    .attr('x', -cardWidth / 2)
    .attr('y', -cardHeight / 2)
    .attr('width', cardWidth)
    .attr('height', cardHeight)
    .attr('rx', 8)
    .attr('fill', 'var(--bs-primary-bg-subtle)')
    .attr('stroke', (d) => (d.depth === 0 ? 'var(--bs-blue)' : 'var(--bs-primary)'))
    .attr('stroke-width', (d) => (d.depth === 0 ? 2.5 : 1.2));

  if (detailLevel === 'low') {
    // Minimal: small indicator only
    node
      .append('rect')
      .attr('x', -12)
      .attr('y', -6)
      .attr('width', 24)
      .attr('height', 12)
      .attr('rx', 3)
      .attr('fill', '#fff')
      .attr('stroke', 'var(--bs-secondary)');
    // Click handler still active for low detail
    node.on('click', (event, d) => options.onClick?.(d.data.id));
    return;
  }

  // Photo placeholder (use image if provided)
  const photoGroup = node.append('g').attr('transform', `translate(${-cardWidth / 2 + 12},0)`);
  photoGroup
    .append('circle')
    .attr('r', 10)
    .attr('fill', '#fff')
    .attr('stroke', 'var(--bs-secondary)');

  // Name line
  node
    .append('text')
    .attr('x', -cardWidth / 2 + 28)
    .attr('y', -4)
    .attr('text-anchor', 'start')
    .attr('font-size', 11)
    .attr('font-weight', (d) => (d.depth === 0 ? 'bold' : 'normal'))
    .attr('fill', '#222')
    .style('user-select', 'none')
    .text((d) => d.data.name);

  if (detailLevel === 'medium') {
    // Medium: name only, omit dates and toggle
    node.on('click', (event, d) => options.onClick?.(d.data.id));
    return;
  }

  // Dates line (if available)
  node
    .append('text')
    .attr('x', -cardWidth / 2 + 28)
    .attr('y', 12)
    .attr('text-anchor', 'start')
    .attr('font-size', 10)
    .attr('fill', 'var(--bs-secondary)')
    .style('user-select', 'none')
    .text((d) => {
      const format = options.datesFormatter ?? ((b?: string | Date | null, d?: string | Date | null) => {
        const bStr = defaultFormatDate(b);
        const dStr = defaultFormatDate(d);
        if (bStr && dStr) return `${bStr} — ${dStr}`;
        if (bStr) return `${bStr}`;
        if (dStr) return `— ${dStr}`;
        return '';
      });
      return format(d.data.birthDate, d.data.deathDate) || '';
    });

  // Toggle button (if applicable)
  const toggleShown = options.showToggle ?? (() => false);
  const toggle = node
    .append('g')
    .attr('transform', `translate(${cardWidth / 2 - 18},${-cardHeight / 2 + 6})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => options.onToggle?.(d.data.id));

  toggle
    .append('rect')
    .attr('width', 16)
    .attr('height', 16)
    .attr('rx', 4)
    .attr('fill', '#fff')
    .attr('stroke', 'var(--bs-secondary)')
    .attr('opacity', (d) => (toggleShown(d) ? 1 : 0));

  toggle
    .append('text')
    .attr('x', 8)
    .attr('y', 12)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', 'var(--bs-secondary)')
    .text((d) => (toggleShown(d) ? '+' : ''))
    .attr('opacity', (d) => (toggleShown(d) ? 1 : 0));

  // Click handler for card
  node.on('click', (event, d) => options.onClick?.(d.data.id));
}
