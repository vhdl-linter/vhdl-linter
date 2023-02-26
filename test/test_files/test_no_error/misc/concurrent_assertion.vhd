entity concurrent_assertion is
end entity;
architecture arch of concurrent_assertion is
  constant test : integer := 1;
begin
  assert test = 1 report "test" severity warning;
  assert test = 1;
  assert test = 1 severity warning;
  postponed assert test = 1 report "test";
end architecture;
