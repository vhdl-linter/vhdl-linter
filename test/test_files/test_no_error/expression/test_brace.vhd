entity test_brace is
end entity;
architecture arch of test_brace is
signal foo, bar : integer; -- vhdl-linter-disable-line unused
begin
  foo <= bar ** (bar / 2);
end architecture;