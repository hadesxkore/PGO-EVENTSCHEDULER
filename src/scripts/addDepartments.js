import { addDepartment } from '../lib/firebase/departments';

const departments = [
  { name: 'PCEDO', location: 'PGB' },
  { name: 'SAP', location: 'PGB' },
  { name: 'CHPT', location: 'PGB' },
  { name: 'BAC', location: 'PGB' },
  { name: 'OPG', location: 'PGB' },
  { name: 'SP', location: 'PGB' },
  { name: 'OPA', location: 'PGB' },
  { name: 'PLO', location: 'PGB' },
  { name: 'JCPJMH', location: 'PGB' },
  { name: 'ODH', location: 'PGB' },
  { name: 'BCMH', location: 'PGB' },
  { name: 'MDH', location: 'PGB' },
  { name: 'PESO', location: 'PGB' },
  { name: 'OPAgriculturist', location: 'PGB' },
  { name: 'PEO', location: 'PGB' },
  { name: 'PG-ENRO', location: 'PGB' },
  { name: 'OPVet', location: 'PGB' },
  { name: 'INB', location: 'PGB' },
  { name: 'PAO', location: 'PGB' },
  { name: 'PPDO', location: 'PGB' },
  { name: 'OSM', location: 'PGB' },
  { name: 'PPO', location: 'PGB' }
];

export async function addAllDepartments() {
  console.log('Starting to add departments...');
  
  for (const department of departments) {
    try {
      const result = await addDepartment(department);
      if (result.success) {
        console.log(`Successfully added department: ${department.name}`);
      } else {
        console.error(`Failed to add department: ${department.name}`);
      }
    } catch (error) {
      console.error(`Error adding department ${department.name}:`, error);
    }
  }
  
  console.log('Finished adding departments.');
}
