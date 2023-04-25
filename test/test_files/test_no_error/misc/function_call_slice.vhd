library ieee;
use ieee.numeric_std.all;
entity function_call_slice is
end entity;
architecture rtl of function_call_slice is
  function fun(par0, par1: u_unsigned) return unsigned is
  begin
    return par0 + par1;
  end function;
  signal uns: u_unsigned(1 downto 0);
begin
  uns <= fun(uns, uns)(1 downto 0);
end architecture;