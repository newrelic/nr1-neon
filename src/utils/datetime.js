export const threeDaysAgo = () => {
  const now = new Date();
  return now.setDate(now.getDate() - 3);
};
