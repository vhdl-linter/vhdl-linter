entity concurrent_assertion is
end entity;
architecture arch of concurrent_assertion is
begin
  assert test = 1 report "test" severity warning; -- test is not defined
end architecture;
