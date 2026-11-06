// Tags des caches "use cache" : toujours propres à un élève (viewerId = empreinte non secrète de sa session),
// pour vider ses données à lui sans toucher à celles des autres.
export const viewerTag = (viewerId: string) => `viewer:${viewerId}`;
export const assignmentsTag = (viewerId: string) => `assignments:${viewerId}`;
