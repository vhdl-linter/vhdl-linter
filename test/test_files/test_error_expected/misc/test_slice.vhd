
library ieee;
use ieee.numeric_std.all;
entity test_slice is
end entity;
architecture rtl of test_slice is
  type test_record is record
    ele : integer;
  end record;
  function fun(par0 : u_unsigned) return test_record is
  begin
    return to_integer(par0);
  end function;
  signal uns : u_unsigned(1 downto 0);
begin
  uns <= fun(uns)(ele); -- This is invalid (the line below is correct) and shall not be parsed without error
  uns <= fun(uns).ele;
end architecture;
