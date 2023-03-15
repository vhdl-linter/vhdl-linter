entity test_wrong_name is
end entity;
architecture arch of test_wrong_name is
  signal x : integer;

begin
  x <= x.all;

end architecture;
