entity foo is
end entity;
architecture arch of foo is
  signal apple: integer; -- vhdl-linter-disable-line unused
begin
  appl <= apple;
end arch;
