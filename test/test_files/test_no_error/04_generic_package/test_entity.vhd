use work.instantiated_pkg.all;
entity test is
end entity;
architecture arch of test is

  signal a : integer := generic_parameter;

begin
a <= a;
end arch;