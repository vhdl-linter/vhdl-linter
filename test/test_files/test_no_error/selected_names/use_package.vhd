use work.pkg_array_def.all;

entity use_pkg is
end entity; 

architecture arch of use_pkg is
  signal rec: test;
  signal arr: test_array(0 to 1);
begin
  rec.element <= arr(0).element;
  arr(1).element <= rec.element;
end architecture;