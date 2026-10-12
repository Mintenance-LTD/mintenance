export interface ScheduleOption {
  id: string;
  label: string;
  time: Date;
}

export const getQuickOptions = (): ScheduleOption[] => {
  const now = new Date();
  const options: ScheduleOption[] = [
    {
      id: 'in_15',
      label: 'In 15 minutes',
      time: new Date(now.getTime() + 15 * 60 * 1000),
    },
    {
      id: 'in_30',
      label: 'In 30 minutes',
      time: new Date(now.getTime() + 30 * 60 * 1000),
    },
    {
      id: 'in_1hr',
      label: 'In 1 hour',
      time: new Date(now.getTime() + 60 * 60 * 1000),
    },
    {
      id: 'tomorrow_9am',
      label: 'Tomorrow at 9 AM',
      time: (() => {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      })(),
    },
  ];

  return options.filter((option) => option.time > now);
};
