package test_package_generic is
generic (
  package test_pkg is new work.generic_pkg generic map (<>)
  );

  use test_pkg.all;
  
  function a return test_pkg.t_testData;
  function b return t_testData;
end package;

package body test_package_generic is 
  function a return t_testData is
  begin
  end function;
  function b return t_testData is
  begin
  end function;
end package body;