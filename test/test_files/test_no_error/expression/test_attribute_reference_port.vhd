library IEEE;
use IEEE.std_logic_1164.all;

package test_attribute_reference is
end package;
package body test_attribute_reference is


  procedure foo(b_unused : integer; Size : integer) is
    variable Data : std_logic_vector(Size - 1 downto 0);
  begin

    Data := (Data'range => 'X');

  end;

  procedure bar(ID : integer; a : std_ulogic_vector) is
  begin
    foo(ID, a'length);

  end procedure bar;
end package body;
