export enum Role {
  ReactorOperator = 'reactor-operator',
  Engineer = 'engineer',
  Technician = 'technician',
  SafetyOfficer = 'safety-officer',
}

export const ALL_ROLES = [
  Role.ReactorOperator,
  Role.Engineer,
  Role.Technician,
  Role.SafetyOfficer,
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ReactorOperator]: 'Reactor Operator',
  [Role.Engineer]: 'Engineer',
  [Role.Technician]: 'Technician',
  [Role.SafetyOfficer]: 'Safety Officer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [Role.ReactorOperator]: 'Controls reactor power output, control rods, and emergency SCRAM',
  [Role.Engineer]: 'Manages subsystems, repairs damage, and handles coolant',
  [Role.Technician]: 'Monitors sensors, calibrates instruments, and predicts failures',
  [Role.SafetyOfficer]: 'Manages shields, radiation, pressure vents, and emergency protocols',
};

/** Role combinations for fewer than 4 players */
export const ROLE_COMBINATIONS: Record<number, Role[][]> = {
  2: [
    [Role.ReactorOperator, Role.Engineer],
    [Role.Technician, Role.SafetyOfficer],
  ],
  3: [
    [Role.ReactorOperator],
    [Role.Engineer, Role.Technician],
    [Role.SafetyOfficer],
  ],
  4: [
    [Role.ReactorOperator],
    [Role.Engineer],
    [Role.Technician],
    [Role.SafetyOfficer],
  ],
};
