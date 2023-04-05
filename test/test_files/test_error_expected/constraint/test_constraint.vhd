library ieee;
use ieee.std_logic_1164.all;
entity test_constraint is
end entity;
architecture arch of test_constraint is
  function resolve(data : test_record_nested) return test_record_nested is
  begin

  end function;
  type test_record is record
    test_element : std_ulogic_vector;
  end record;
  type test_array is array (integer) of test_record;
  subtype test_subtype1 is test_record(test_element(5 downto 0));
  subtype test_subtype2 is test_array(5 downto 2);
  subtype test_subtype3 is test_array(5 downto 2)(test_element(5 downto 0));
  type test_record_nested is record
    test_element_nested : test_record;
  end record;
  type test_array_nested is array(integer) of test_record_nested;
  subtype test_subtype_nested_1 is test_record_nested(test_element_nested(test_element(5 downto 0)));
  subtype test_subtype_nested_2 is test_array_nested(5 downto 2)(test_element_nested(test_element(5 downto 0)));
  subtype test_subtype_nested_3 is (resolve) test_array_nested(5 downto 2)(test_element_nested(test_element(5 downto 0)));

begin
end architecture;
