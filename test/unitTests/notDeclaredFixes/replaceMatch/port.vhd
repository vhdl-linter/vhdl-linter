entity foo is
  port (
    apple_unused: inout integer
  );
end entity;
architecture arch of foo is
begin
  appl_unused <= apple_unused;
end arch;
