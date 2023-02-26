entity concurrent_assertion is
end entity;
architecture arch of concurrent_assertion is
  constant test : integer := 1;
begin
  label1 : process is
  begin
    postponed assert test = 1 report "test" severity warning;  -- postponed not allowed
  end process;
end architecture;
