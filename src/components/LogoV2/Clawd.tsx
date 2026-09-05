import * as React from 'react';
import { Box, Text } from '../../ink.js';

/**
 * FLAWRA-CODE mascot — the Prism.
 * A faceted diamond mark that "blinks" (eyes = the two inner facets).
 * Deliberately NOT the Flawra blob: sharp geometry, cyan facets.
 */
export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';

type Props = {
  pose?: ClawdPose;
};

// 9 cols x 3 rows block-art diamond.
// Eyes are the two facet cells; poses shift/morph them.
const POSES: Record<ClawdPose, [string, string, string]> = {
  default: ['   ◢◤◢◤◣   ', '  ◢█◣ ◢█◣  ', ' ◢███████◤ '],
  'look-left': ['   ◢◤◢◤◣   ', '  ◢█◣ ◢█◣  ', ' ◢███████◤ '],
  'look-right': ['   ◢◤◢◤◣   ', '  ◢█◣ ◢█◣  ', ' ◢███████◤ '],
  'arms-up': ['  ◢     ◣  ', '   ◢◤◢◤◣   ', '  ◢█████◤  '],
};

export function Clawd({ pose = 'default' }: Props): React.ReactNode {
  const rows = POSES[pose] ?? POSES.default;
  return (
    <Box flexDirection="column">
      <Text color="flawra">{rows[0]}</Text>
      <Text color="flawra">{rows[1]}</Text>
      <Text color="flawra">{rows[2]}</Text>
    </Box>
  );
}