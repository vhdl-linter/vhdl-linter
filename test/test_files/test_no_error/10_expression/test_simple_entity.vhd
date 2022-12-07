entity test_simple_entity is

end entity;
architecture arch of test_simple_entity is

  signal a : integer;
  signal b : integer;

begin
 a <= 5 + 7;
 b <= 5 + a;
end arch ; --