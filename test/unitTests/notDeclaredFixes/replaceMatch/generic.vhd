entity foo is
  generic (
    apple_unused: integer
  );
end entity;
architecture arch of foo is
begin
  assert true report appl_unused;
end arch;
