entity concurrent_assertion is
end entity;
architecture arch of concurrent_assertion is
  constant test : integer;

begin
  assert test = 1 report message severity warning; -- message is not defined
end architecture;
