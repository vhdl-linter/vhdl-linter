entity concurrent_assertion is
end entity;
architecture arch of concurrent_assertion is
  constant test : integer;
  constant message : string := "message";
  -- constant sever : severity_level := warning;
begin
  assert test = 1 report message severity sever; -- sever is not defined
end architecture;
