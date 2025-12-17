
// This file needs the checkActiveImpersonation function added to the useEffect dependency array at line 96
// Since I cannot see the full file, I'll provide the fix pattern:

// Find this pattern around line 96:
// useEffect(() => {
//   checkActiveImpersonation();
// }, []);

// Replace with:
// useEffect(() => {
//   checkActiveImpersonation();
// }, [checkActiveImpersonation]);

// Make sure checkActiveImpersonation is wrapped in useCallback earlier in the file
