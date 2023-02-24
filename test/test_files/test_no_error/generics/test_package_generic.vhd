package test_package_generic is
generic (
  package test_pkg is new work.generic_pkg generic map (<>)
  );

  use test_pkg.all;
  
  variable a : test_pkg.t_testData;
  variable b : integer := generic_parameter;
end package;

package body test_package_generic is 
  variable b : integer := generic_parameter;
end body;