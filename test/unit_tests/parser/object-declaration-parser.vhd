package test_pkg is
  constant TEST : integer := 3
  variable TEST3 : integer := 3
  file TEST : integer
  constant TEST2: integer := 3
  file TEST4, TEST5 : integer;
end package;

entity test_ent is
end entity;
architecture arch of test_ent is
  signal TEST4_unused : integer := 3
  constant TEST_unused : integer := 3
  variable TEST3_unused : integer := 3
  file TEST_unused : integer

begin

end architecture;